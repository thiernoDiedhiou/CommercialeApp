<?php

namespace App\Observers;

use App\Models\Branch;
use App\Models\Tenant;
use Database\Seeders\DefaultGroupSeeder;

class TenantObserver
{
    /**
     * Crée automatiquement les 3 groupes par défaut (Administrateur,
     * Gestionnaire, Vendeur) ET une succursale "Principal" dès qu'un
     * nouveau tenant est créé.
     */
    public function created(Tenant $tenant): void
    {
        DefaultGroupSeeder::createForTenant($tenant);

        Branch::create([
            'tenant_id' => $tenant->id,
            'name' => 'Principal',
            'type' => 'principal',
            'is_active' => true,
            'display_order' => 0,
        ]);
    }
}
