<?php

namespace App\Console\Commands;

use App\Jobs\SendSubscriptionInvoiceJob;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Commande de test uniquement — ne jamais utiliser en production.
 *
 * Crée une transaction fictive complète et envoie la facture par email
 * pour valider le rendu du PDF et du template email.
 *
 * Usage :
 *   php artisan billing:test-invoice
 *   php artisan billing:test-invoice --tenant=demo
 */
class TestSubscriptionInvoice extends Command
{
    protected $signature   = 'billing:test-invoice {--tenant=demo : Slug du tenant de test}';
    protected $description = '[DEV] Envoie une facture d\'abonnement fictive pour tester le rendu email + PDF';

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->error('Cette commande est interdite en production.');
            return 1;
        }

        $slug   = $this->option('tenant');
        $tenant = Tenant::where('slug', $slug)->first();

        if (! $tenant) {
            $this->error("Tenant '{$slug}' introuvable. Utilisez --tenant=<slug>");
            return 1;
        }

        $plan = Plan::where('is_active', true)->where('is_public', true)->first();

        if (! $plan) {
            $this->error('Aucun plan public actif trouvé. Créez-en un dans Super Admin → Plans.');
            return 1;
        }

        $this->info("Tenant  : {$tenant->name}");
        $this->info("Plan    : {$plan->name}");
        $this->info("Mailer  : " . config('mail.default'));

        // Abonnement fictif (non persisté en DB si existant)
        $subscription = TenantSubscription::where('tenant_id', $tenant->id)->latest()->first()
            ?? new TenantSubscription([
                'tenant_id'    => $tenant->id,
                'plan_id'      => $plan->id,
                'billing_cycle'=> 'monthly',
                'status'       => 'active',
                'starts_at'    => now(),
                'ends_at'      => now()->addDays(30),
            ]);

        // Transaction fictive complète
        $transaction = DB::transaction(function () use ($tenant, $plan, $subscription) {
            if (! $subscription->exists) {
                $subscription->save();
            }

            return PaymentTransaction::create([
                'idempotency_key' => 'test-' . now()->format('YmdHis') . '-' . $tenant->id,
                'invoice_number'  => 'ABN-TST-' . now()->format('His'),
                'tenant_id'       => $tenant->id,
                'plan_id'         => $plan->id,
                'provider'        => 'null',
                'provider_token'  => 'test-token-' . uniqid(),
                'billing_cycle'   => 'monthly',
                'amount'          => (int) $plan->price_monthly,
                'currency'        => $tenant->currency ?? 'XOF',
                'status'          => 'completed',
                'subscription_id' => $subscription->id,
                'expires_at'      => now()->addHour(),
            ]);
        });

        $this->info("Transaction : {$transaction->invoice_number}");
        $this->info("Envoi de la facture…");

        // Dispatch synchrone pour voir le résultat immédiatement
        SendSubscriptionInvoiceJob::dispatchSync($transaction);

        $this->newLine();

        if (config('mail.default') === 'log') {
            $this->info("✅ Email écrit dans storage/logs/laravel.log");
            $this->line("   → grep 'ABN-TEST' storage/logs/laravel.log | head -5");
        } else {
            $this->info("✅ Email envoyé à l'administrateur du tenant.");
        }

        // Nettoyage : supprimer la transaction de test via DB directement
        // (bypass le boot() qui interdit la suppression des transactions)
        \Illuminate\Support\Facades\DB::table('payment_transactions')
            ->where('id', $transaction->id)
            ->delete();
        $this->line("   (transaction de test supprimée de la DB)");

        return 0;
    }
}
