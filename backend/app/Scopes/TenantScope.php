<?php

namespace App\Scopes;

use App\Services\TenantService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantService = app(TenantService::class);

        // Pas de tenant résolu (ex: commandes Artisan, seeds) → pas de filtre
        if (! $tenantService->hasCurrentTenant()) {
            return;
        }

        $builder->where($model->getTable() . '.tenant_id', $tenantService->currentId());
    }
}
