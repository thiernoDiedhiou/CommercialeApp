<?php

namespace App\Traits;

use App\Models\Tenant;
use App\Scopes\TenantScope;
use App\Services\TenantService;

/**
 * Applique automatiquement le filtre tenant_id sur tous les modèles métier.
 * Injecte aussi tenant_id au moment de la création (creating event).
 *
 * Usage : ajouter `use BelongsToTenant;` dans chaque modèle métier.
 *
 * Les @method ci-dessous déclarent les méthodes héritées de Model utilisées
 * dans bootBelongsToTenant — nécessaire pour résoudre Intelephense P1013
 * (le trait est analysé isolément, sans connaître la classe hôte).
 *
 * @method static void addGlobalScope(\Illuminate\Database\Eloquent\Scope|\Closure|string $scope, ?\Closure $implementation = null)
 * @method static void creating(\Closure|string $callback, int $priority = 0)
 * @mixin \Illuminate\Database\Eloquent\Model
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        // Filtre global : toutes les requêtes SELECT incluent WHERE tenant_id = ?
        static::addGlobalScope(new TenantScope());

        // Injection automatique du tenant_id à la création
        static::creating(function ($model) {
            if (empty($model->tenant_id)) {
                $tenantService = app(TenantService::class);
                $model->tenant_id = $tenantService->currentId();
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
