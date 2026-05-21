<?php

namespace Database\Seeders;

use App\Models\Group;
use App\Models\Permission;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class DefaultGroupSeeder extends Seeder
{
    // Permissions refusées au Gestionnaire (il a tout le reste)
    private const GESTIONNAIRE_EXCLUDED = [
        'users.delete',
        'settings.edit',
    ];

    // Permissions accordées au Vendeur (liste explicite)
    private const VENDEUR_PERMISSIONS = [
        'pos.access',
        'pos.discount',
        'sales.view',
        'sales.create',
        'returns.view',
        'products.view',
        'customers.view',
        'customers.create',
    ];

    /**
     * Crée les 3 groupes par défaut pour un tenant donné.
     * Idempotent — peut être rappelé sans créer de doublons.
     * Appelé par TenantObserver lors de la création d'un tenant.
     */
    public static function createForTenant(Tenant $tenant): void
    {
        // Toutes les permissions indexées par name → id
        $all = Permission::pluck('id', 'name');

        if ($all->isEmpty()) {
            // Permissions non encore seedées — ne rien créer
            return;
        }

        static::upsertGroup(
            tenant: $tenant,
            name: 'Administrateur',
            description: 'Accès complet à toutes les fonctionnalités.',
            permissionIds: $all->values()->toArray(),
        );

        static::upsertGroup(
            tenant: $tenant,
            name: 'Gestionnaire',
            description: 'Gestion opérationnelle complète, sans suppression d\'utilisateurs ni paramètres sensibles.',
            permissionIds: $all->except(self::GESTIONNAIRE_EXCLUDED)->values()->toArray(),
        );

        static::upsertGroup(
            tenant: $tenant,
            name: 'Vendeur',
            description: 'Accès limité au point de vente et aux ventes.',
            permissionIds: $all->only(self::VENDEUR_PERMISSIONS)->values()->toArray(),
        );
    }

    private static function upsertGroup(
        Tenant $tenant,
        string $name,
        string $description,
        array $permissionIds,
    ): void {
        $group = Group::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => $name],
            ['description' => $description],
        );

        // sync() remplace toujours la liste complète des permissions
        $group->permissions()->sync($permissionIds);
    }

    /**
     * Utilisé par DatabaseSeeder — crée les groupes pour tous les tenants existants.
     */
    public function run(): void
    {
        $tenants = Tenant::all();

        if ($tenants->isEmpty()) {
            $this->command->warn('Aucun tenant trouvé. Créez un tenant avant de lancer ce seeder.');
            return;
        }

        foreach ($tenants as $tenant) {
            static::createForTenant($tenant);
            $this->command->info("✓ Groupes créés pour le tenant : {$tenant->name}");
        }
    }
}
