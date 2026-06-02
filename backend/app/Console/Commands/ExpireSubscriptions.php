<?php

namespace App\Console\Commands;

use App\Models\TenantSubscription;
use App\Services\MailService;
use App\Services\TenantService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ExpireSubscriptions extends Command
{
    protected $signature   = 'subscription:expire';
    protected $description = 'Expire les abonnements échus et envoie les notifications J-7 / J-1';

    // Paliers de notification (ordre croissant obligatoire pour le calcul des fenêtres)
    private const NOTIFY_DAYS = [1, 7];

    public function __construct(
        private readonly MailService   $mailService,
        private readonly TenantService $tenantService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->notifyExpiring();
        $this->expireExpired();

        return self::SUCCESS;
    }

    // ── Notifications avant expiration ────────────────────────────────────────
    // Envoie exactement UNE notification par abonnement et par palier.
    // Fenêtres : J-1 = [0, 1], J-7 = ]1, 7]
    // → à J-1, seul le palier 1 déclenche (pas le 7), même si J-7 a été sauté.

    private function notifyExpiring(): void
    {
        // Fix #6 : eager-load tenant.users pour éviter N+1 dans sendExpiryWarning
        $subscriptions = TenantSubscription::with([
            'tenant',
            'tenant.users' => fn ($q) => $q->where('is_active', true)->whereNotNull('email'),
            'plan',
        ])
            ->whereIn('status', ['trial', 'active'])
            ->whereNotNull('ends_at')
            ->where('ends_at', '>', now())
            ->get();

        foreach ($subscriptions as $sub) {
            $daysLeft = $sub->daysUntilExpiry();
            if ($daysLeft === null) {
                continue;
            }

            // Fix #2 : chaque seuil a une fenêtre exclusive pour éviter les doubles envois.
            // NOTIFY_DAYS est trié ASC → lowerBound du seuil i = seuil i-1 (ou 0).
            foreach (self::NOTIFY_DAYS as $index => $threshold) {
                $lowerBound = $index > 0 ? self::NOTIFY_DAYS[$index - 1] : 0;

                // Fenêtre : lowerBound < daysLeft <= threshold
                if ($daysLeft > $lowerBound && $daysLeft <= $threshold && ! $sub->alreadyNotified($threshold)) {
                    $this->sendExpiryWarning($sub, $daysLeft);
                    $sub->markNotified($threshold);

                    $this->line("  [notif J-{$threshold}] {$sub->tenant->name} ({$daysLeft}j restants)");
                }
            }
        }
    }

    // ── Suspension des abonnements expirés ────────────────────────────────────

    private function expireExpired(): void
    {
        $expired = TenantSubscription::with('tenant')
            ->whereIn('status', ['trial', 'active'])
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->get();

        foreach ($expired as $sub) {
            $sub->update(['status' => 'expired']);

            if ($sub->tenant && $sub->tenant->is_active) {
                $sub->tenant->update(['is_active' => false]);

                // Fix #3 : vider le cache Redis pour que le middleware reflète
                // immédiatement le statut suspendu (sans attendre le TTL 24h).
                $this->tenantService->flushCache($sub->tenant->api_key);

                Log::info('Tenant suspendu (abonnement expiré)', [
                    'tenant_id' => $sub->tenant->id,
                    'tenant'    => $sub->tenant->name,
                    'plan'      => $sub->plan?->name,
                    'ended_at'  => $sub->ends_at->toISOString(),
                ]);

                $this->line("  [expiré] {$sub->tenant->name} — suspendu");
            }
        }

        $count = $expired->count();

        $count > 0
            ? $this->info("✓ {$count} abonnement(s) expiré(s) — tenants suspendus.")
            : $this->info('✓ Aucun abonnement expiré.');
    }

    // ── Envoi des emails de warning ───────────────────────────────────────────

    private function sendExpiryWarning(TenantSubscription $sub, int $daysLeft): void
    {
        // Fix #6 : $sub->tenant->users est déjà eager-loadé, pas de requête supplémentaire
        foreach ($sub->tenant->users as $admin) {
            try {
                $this->mailService->sendSubscriptionExpiring($sub->tenant, $admin, $daysLeft);
            } catch (\Throwable $e) {
                Log::warning('Échec notification expiration', [
                    'tenant_id' => $sub->tenant_id,
                    'user_id'   => $admin->id,
                    'error'     => $e->getMessage(),
                ]);
            }
        }
    }
}
