<?php

namespace App\Services;

use App\Contracts\PaymentGatewayInterface;
use App\DTOs\Payment\PaymentRequest;
use App\DTOs\Payment\PaymentStatus;
use App\Jobs\SendSubscriptionInvoiceJob;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class PaymentService
{
    public function __construct(
        private readonly PaymentGatewayInterface $gateway,
    ) {}

    // ── Initiation ─────────────────────────────────────────────────────────────

    /**
     * Initie le renouvellement d'abonnement pour un tenant.
     *
     * Retourne l'URL de checkout vers laquelle rediriger le tenant.
     * Si une transaction pending non-expirée existe déjà (idempotence),
     * retourne l'URL existante sans créer de doublon.
     */
    public function initiateRenewal(Tenant $tenant, Plan $plan, string $billingCycle): string
    {
        $amount   = $billingCycle === 'yearly'
            ? (int) ($plan->price_yearly ?? $plan->price_monthly * 12)
            : (int) $plan->price_monthly;

        $currency = $tenant->currency ?? 'XOF';

        // Clé d'idempotence : unique par tenant + plan + cycle + mois calendaire
        $idempotencyKey = hash('sha256', implode('|', [
            $tenant->id,
            $plan->id,
            $billingCycle,
            now()->format('Ym'), // ex: 202606
        ]));

        // Vérifier si une transaction pending non-expirée existe déjà
        $existing = PaymentTransaction::where('idempotency_key', $idempotencyKey)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->first();

        if ($existing && $existing->provider_token) {
            // Réutiliser l'URL de checkout stockée si le paiement est toujours en attente.
            // checkout_url est stocké à la création pour éviter toute dépendance
            // au provider (Bictorys n'expose pas de reconstruction depuis un token).
            if ($this->gateway->verifyPayment($existing->provider_token) === PaymentStatus::Pending) {
                return $existing->checkout_url ?? $this->buildCheckoutUrl($existing->provider_token);
            }
            return $this->createFreshInvoice($tenant, $plan, $billingCycle, $amount, $currency, $idempotencyKey);
        }

        return $this->createFreshInvoice($tenant, $plan, $billingCycle, $amount, $currency, $idempotencyKey);
    }

    private function createFreshInvoice(
        Tenant $tenant,
        Plan   $plan,
        string $billingCycle,
        int    $amount,
        string $currency,
        string $idempotencyKey,
    ): string {
        $frontendUrl = rtrim(config('app.frontend_url', 'https://didisphere.shop'), '/');
        $adminName   = $tenant->users()->whereHas('groups', fn ($q) => $q->where('name', 'Administrateur'))->first()?->name ?? $tenant->name;
        $adminEmail  = $tenant->email;

        $request = new PaymentRequest(
            idempotencyKey: $idempotencyKey,
            amount        : $amount,
            currency      : $currency,
            description   : "Abonnement DiDi Sphere — Plan {$plan->name} ({$billingCycle})",
            returnUrl     : "{$frontendUrl}/billing/success",
            cancelUrl     : "{$frontendUrl}/billing/cancel",
            customerName  : $adminName,
            customerEmail : $adminEmail,
        );

        $result = $this->gateway->createInvoice($request);

        $ttl = config('payment.link_ttl', 3600);

        try {
            PaymentTransaction::updateOrCreate(
                ['idempotency_key' => $idempotencyKey],
                [
                    'tenant_id'      => $tenant->id,
                    'plan_id'        => $plan->id,
                    'provider'       => config('payment.provider') ?? 'null',
                    'provider_token' => $result->providerToken,
                    'checkout_url'   => $result->checkoutUrl,
                    'billing_cycle'  => $billingCycle,
                    'amount'         => $amount,
                    'currency'       => $currency,
                    'status'         => 'pending',
                    'expires_at'     => now()->addSeconds($ttl),
                ]
            );
        } catch (UniqueConstraintViolationException) {
            // Double-clic ou double requête simultanée du même tenant :
            // la transaction a déjà été créée par l'autre requête — on retourne
            // simplement l'URL existante sans créer de doublon.
            Log::info("initiateRenewal: collision idempotency_key [{$idempotencyKey}] — transaction déjà créée, URL réutilisée.");
        }

        return $result->checkoutUrl;
    }

    private function buildCheckoutUrl(string $providerToken): string
    {
        $mode = config('payment.paydunya.mode', 'test');
        return $mode === 'live'
            ? "https://checkout.paydunya.com/{$providerToken}"
            : "https://checkout.sandbox.paydunya.com/{$providerToken}";
    }

    // ── Vérification fallback (webhook manqué) ────────────────────────────────

    /**
     * Vérifie directement le statut du paiement auprès du provider.
     * Appelé depuis BillingSuccessPage quand le webhook n'est pas encore arrivé.
     *
     * Retourne le statut final : 'completed' | 'pending' | 'failed' | 'cancelled'
     */
    public function checkAndComplete(PaymentTransaction $transaction): string
    {
        if (! $transaction->provider_token) {
            return 'pending';
        }

        $status = $this->gateway->verifyPayment($transaction->provider_token);

        if ($status === PaymentStatus::Completed && $transaction->isPending()) {
            DB::transaction(function () use ($transaction) {
                // Re-lire avec verrou pour éviter la double activation
                // si BillingSuccessPage est appelé deux fois simultanément.
                $fresh = PaymentTransaction::where('id', $transaction->id)
                    ->lockForUpdate()
                    ->first();
                if ($fresh && $fresh->isPending()) {
                    $this->activateSubscription($fresh);
                }
            });
            return 'completed';
        }

        if ($status === PaymentStatus::Failed) {
            DB::table('payment_transactions')
                ->where('id', $transaction->id)
                ->update(['status' => 'failed', 'updated_at' => now()]);
            return 'failed';
        }

        return $status->value;
    }

    // ── Traitement webhook ─────────────────────────────────────────────────────

    /**
     * Traite un webhook entrant du provider de paiement.
     *
     * 1. Vérifie la signature
     * 2. Retrouve la PaymentTransaction via provider_token
     * 3. Active ou rejette l'abonnement selon le statut
     * 4. Tout dans une DB::transaction atomique
     */
    public function handleWebhook(Request $request): void
    {
        if (! $this->gateway->verifyWebhookSignature($request)) {
            Log::warning('Payment webhook: signature invalide', [
                'ip'      => $request->ip(),
                'headers' => $request->headers->all(),
            ]);
            return;
        }

        $event = $this->gateway->parseWebhook($request);

        // Tout le traitement est dans une transaction DB avec lockForUpdate().
        // Si deux webhooks identiques arrivent simultanément, le second attend
        // que le premier commite → il lit status=completed → return immédiat.
        DB::transaction(function () use ($event) {
            $transaction = PaymentTransaction::where('provider_token', $event->providerToken)
                ->lockForUpdate()  // verrou exclusif : un seul webhook à la fois
                ->first();

            if (! $transaction) {
                Log::warning('Payment webhook: transaction introuvable', [
                    'provider_token' => $event->providerToken,
                ]);
                return;
            }

            // Idempotence : ignorer si déjà traité (completed ou failed)
            // IMPORTANT : on traite même si expires_at est dépassée — le provider a quand
            // même encaissé le paiement, on doit activer l'abonnement du tenant.
            if ($transaction->isCompleted() || $transaction->isFailed()) {
                return;
            }

            // Remettre en pending si un webhook completed arrive sur une transaction
            // qui a été marquée cancelled par le job d'expiration (tenant a payé tard)
            if ($transaction->status === 'cancelled' && $event->status === PaymentStatus::Completed) {
                $transaction->status = 'pending';
                $transaction->save();
            }

            // Stocker le moyen de paiement réel et le payload brut avant traitement
            $transaction->webhook_payload      = $event->rawPayload;
            $transaction->payment_method_label = $event->paymentMethodLabel;

            match ($event->status) {
                PaymentStatus::Completed => $this->activateSubscription($transaction),
                PaymentStatus::Failed    => $transaction->update([
                    'status'               => 'failed',
                    'payment_method_label' => $event->paymentMethodLabel,
                    'webhook_payload'      => $event->rawPayload,
                ]),
                PaymentStatus::Cancelled => $transaction->update([
                    'status'               => 'cancelled',
                    'payment_method_label' => $event->paymentMethodLabel,
                    'webhook_payload'      => $event->rawPayload,
                ]),
                default => null, // Pending — on attend
            };
        });
    }

    /**
     * Active (ou renouvelle) l'abonnement après confirmation du paiement.
     * Appelé dans une transaction DB existante.
     */
    private function activateSubscription(PaymentTransaction $transaction): void
    {
        $tenant        = $transaction->tenant;
        $plan          = $transaction->plan;
        $billingCycle  = $transaction->billing_cycle;

        if (! $plan) {
            throw new RuntimeException("PaymentTransaction #{$transaction->id} : plan introuvable.");
        }

        $daysMap = ['monthly' => 30, 'yearly' => 365];
        $days    = $daysMap[$billingCycle] ?? 30;

        // Désactiver les abonnements actifs ou en essai précédents
        TenantSubscription::where('tenant_id', $tenant->id)
            ->whereIn('status', ['trial', 'active'])
            ->update(['status' => 'expired', 'ends_at' => now()]);

        $subscription = TenantSubscription::create([
            'tenant_id'    => $tenant->id,
            'plan_id'      => $plan->id,
            'billing_cycle'=> $billingCycle,
            'status'       => 'active',
            'starts_at'    => now(),
            'ends_at'      => now()->addDays($days),
        ]);

        // Génère le numéro de facture — format ABN-YYYY-XXXXX
        // Basé sur l'ID auto-increment (unique par définition) plutôt que COUNT(*)
        // qui causerait des doublons en cas de paiements simultanés.
        $year          = now()->format('Y');
        $invoiceNumber = sprintf('ABN-%s-%05d', $year, $transaction->id);

        // Mise à jour de la transaction — état final immuable
        $transaction->update([
            'status'               => 'completed',
            'invoice_number'       => $invoiceNumber,
            'subscription_id'      => $subscription->id,
            'payment_method_label' => $transaction->payment_method_label, // déjà set par parseWebhook
            'webhook_payload'      => $transaction->webhook_payload,
        ]);

        Log::info("Abonnement activé : tenant #{$tenant->id}, plan {$plan->name}, cycle {$billingCycle}");

        // Envoi de la facture par email — hors transaction DB
        SendSubscriptionInvoiceJob::dispatch($transaction->fresh())->onQueue('notifications');
    }
}
