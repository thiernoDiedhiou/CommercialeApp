<?php

namespace App\Observers;

use App\Models\Tenant;
use Database\Seeders\DefaultGroupSeeder;

class TenantObserver
{
    /**
     * Crée automatiquement les 3 groupes par défaut (Administrateur,
     * Gestionnaire, Vendeur) dès qu'un nouveau tenant est créé.
     * Si les permissions n'ont pas encore été seedées, la création
     * est silencieusement ignorée (DefaultGroupSeeder::createForTenant gère ce cas).
     */
    public function created(Tenant $tenant): void
    {
        DefaultGroupSeeder::createForTenant($tenant);
    }
}
