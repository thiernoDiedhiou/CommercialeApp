<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\TenantService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PurgeScheduledTenantDeletions extends Command
{
    protected $signature   = 'tenants:purge-scheduled-deletions';
    protected $description = 'Supprime définitivement les tenants dont la fenêtre de grâce RGPD est expirée';

    public function __construct(private readonly TenantService $tenantService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $tenants = Tenant::onlyTrashed()
            ->whereNotNull('scheduled_deletion_at')
            ->where('scheduled_deletion_at', '<=', now())
            ->get();

        if ($tenants->isEmpty()) {
            $this->info('Aucun tenant à purger.');
            return self::SUCCESS;
        }

        $purged = 0;

        foreach ($tenants as $tenant) {
            try {
                // Nettoyage logo stockage
                if ($tenant->logo_path) {
                    Storage::disk('public')->delete($tenant->logo_path);
                }

                // Invalidation cache Redis/DB
                $this->tenantService->flushCache($tenant->api_key);

                // Audit RGPD complet avant la suppression (après forceDelete le tenant n'existe plus)
                $auditRecord = [
                    'tenant_id'          => $tenant->id,
                    'tenant_name'        => $tenant->name,
                    'tenant_slug'        => $tenant->slug,
                    'deletion_requested_by'  => $tenant->deletion_requested_by ?? 'inconnu',
                    'deletion_requested_at'  => $tenant->deletion_requested_at?->toISOString() ?? 'inconnu',
                    'deletion_scheduled_at'  => $tenant->scheduled_deletion_at?->toISOString(),
                    'deletion_executed_at'   => now()->toISOString(),
                    'deleted_at_soft'        => $tenant->deleted_at?->toISOString(),
                ];

                // Suppression définitive — cascade DB gère les données liées
                $tenant->forceDelete();

                $purged++;
                Log::info("[RGPD] Tenant purgé définitivement", $auditRecord);
                $this->line("[RGPD] {$auditRecord['tenant_name']} — exécuté le {$auditRecord['deletion_executed_at']}");
            } catch (\Throwable $e) {
                Log::error("Échec purge tenant", [
                    'tenant_id' => $tenant->id,
                    'error'     => $e->getMessage(),
                ]);
                $this->error("Erreur pour le tenant #{$tenant->id} : {$e->getMessage()}");
            }
        }

        $this->info("{$purged} tenant(s) purgé(s) définitivement.");
        return self::SUCCESS;
    }
}
