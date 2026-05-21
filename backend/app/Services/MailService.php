<?php

namespace App\Services;

use App\Mail\InvoiceSentMail;
use App\Mail\StockAlertMail;
use App\Mail\TenantWelcomeMail;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Contracts\Mail\Mailer as MailerContract;
use Illuminate\Mail\Mailer;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;

class MailService
{
    /**
     * Retourne le mailer à utiliser pour ce tenant.
     *
     * Priorité : SMTP tenant (settings) > SMTP global (.env)
     */
    public function resolveMail(Tenant $tenant): MailerContract
    {
        $smtpHost = $this->tenantSetting($tenant, 'smtp_host');

        if ($smtpHost) {
            $port       = (int) ($this->tenantSetting($tenant, 'smtp_port') ?? 587);
            $encryption = $this->tenantSetting($tenant, 'smtp_encryption') ?? 'tls';
            $username   = $this->tenantSetting($tenant, 'smtp_username') ?? '';
            $password   = $this->tenantSetting($tenant, 'smtp_password') ?? '';
            $fromAddr   = $this->tenantSetting($tenant, 'smtp_from_address') ?? '';
            $fromName   = $this->tenantSetting($tenant, 'smtp_from_name') ?? $tenant->name;

            $transport = new EsmtpTransport($smtpHost, $port, $encryption === 'ssl');
            $transport->setUsername($username);
            $transport->setPassword($password);

            $mailer = new Mailer(
                'tenant_smtp',
                app('view'),
                $transport,
                app('events'),
            );
            $mailer->alwaysFrom($fromAddr, $fromName);

            return $mailer;
        }

        return Mail::mailer(config('mail.default'));
    }

    /**
     * Envoie une alerte stock aux utilisateurs du tenant ayant stock.view.
     * Appelé depuis SendStockAlertJob.
     */
    public function sendStockAlert(Tenant $tenant, Product $product, ?ProductVariant $variant = null): void
    {
        $threshold    = (int) ($variant?->alert_threshold ?? $product->alert_threshold ?? 0);
        $currentStock = (float) ($variant ? $variant->stock_quantity : $product->stock_quantity);

        // Utilisateurs actifs avec permission stock.view et un email
        $recipients = User::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->whereNotNull('email')
            ->whereHas('groups', fn ($q) =>
                $q->whereHas('permissions', fn ($q2) =>
                    $q2->where('name', 'stock.view')
                )
            )
            ->get();

        if ($recipients->isEmpty()) {
            return;
        }

        $mailer   = $this->resolveMail($tenant);
        $mailable = new StockAlertMail($tenant, $product, $variant, $currentStock, $threshold);

        foreach ($recipients as $user) {
            try {
                $mailer->to($user->email, $user->name)->send($mailable); // @phpstan-ignore-line
            } catch (\Throwable $e) {
                Log::channel('daily')->error('StockAlert mail failed', [
                    'user_id'    => $user->id,
                    'product_id' => $product->id,
                    'error'      => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Envoie la facture au client par email avec le PDF en pièce jointe.
     * Retourne false si le client n'a pas d'email.
     * Appelé depuis SendInvoiceEmailJob.
     */
    public function sendInvoice(Invoice $invoice): bool
    {
        $invoice->loadMissing(['customer', 'items.product']);

        $email    = $invoice->customer?->email;
        $tenant   = Tenant::findOrFail($invoice->tenant_id);

        if (empty($email)) {
            return false;
        }

        try {
            $this->resolveMail($tenant)
                ->to($email, $invoice->customer?->name) // @phpstan-ignore-line
                ->send(new InvoiceSentMail($invoice, $tenant));

            return true;
        } catch (\Throwable $e) {
            Log::channel('daily')->error('Invoice mail failed', [
                'invoice_id' => $invoice->id,
                'error'      => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Envoie les accès de connexion au premier admin d'un nouveau tenant.
     * Toujours via le SMTP global (.env) car le tenant n'a pas encore de SMTP configuré.
     * Appelé depuis SendTenantWelcomeJob.
     */
    public function sendTenantWelcome(Tenant $tenant, User $admin, string $plainPassword): void
    {
        if (empty($admin->email)) {
            return;
        }

        try {
            Mail::to($admin->email, $admin->name)
                ->send(new TenantWelcomeMail($tenant, $admin, $plainPassword));
        } catch (\Throwable $e) {
            Log::channel('daily')->error('TenantWelcome mail failed', [
                'tenant_id' => $tenant->id,
                'error'     => $e->getMessage(),
            ]);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function tenantSetting(Tenant $tenant, string $key): ?string
    {
        $value = $tenant->settings()->where('key', $key)->value('value');

        return $value ?: null;
    }
}
