<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    // Catalogue complet des permissions de la plateforme.
    // Idempotent — peut être relancé sans risque (firstOrCreate).
    private static array $permissions = [
        // Dashboard
        ['name' => 'dashboard.view',        'display_name' => 'Voir le tableau de bord',    'module' => 'dashboard',    'action' => 'view'],

        // Produits
        ['name' => 'products.view',         'display_name' => 'Voir les produits',           'module' => 'products',     'action' => 'view'],
        ['name' => 'products.create',       'display_name' => 'Créer un produit',            'module' => 'products',     'action' => 'create'],
        ['name' => 'products.edit',         'display_name' => 'Modifier un produit',         'module' => 'products',     'action' => 'edit'],
        ['name' => 'products.delete',       'display_name' => 'Supprimer un produit',        'module' => 'products',     'action' => 'delete'],
        ['name' => 'products.import',       'display_name' => 'Importer des produits CSV',   'module' => 'products',     'action' => 'import'],

        // Catégories
        ['name' => 'categories.view',       'display_name' => 'Voir les catégories',         'module' => 'categories',   'action' => 'view'],
        ['name' => 'categories.create',     'display_name' => 'Créer une catégorie',         'module' => 'categories',   'action' => 'create'],
        ['name' => 'categories.edit',       'display_name' => 'Modifier une catégorie',      'module' => 'categories',   'action' => 'edit'],
        ['name' => 'categories.delete',     'display_name' => 'Supprimer une catégorie',     'module' => 'categories',   'action' => 'delete'],

        // Stock
        ['name' => 'stock.view',            'display_name' => 'Voir le stock',               'module' => 'stock',        'action' => 'view'],
        ['name' => 'stock.adjust',          'display_name' => 'Ajuster le stock',            'module' => 'stock',        'action' => 'adjust'],

        // Variantes
        ['name' => 'variants.view',         'display_name' => 'Voir les variantes',          'module' => 'variants',     'action' => 'view'],
        ['name' => 'variants.create',       'display_name' => 'Créer une variante',          'module' => 'variants',     'action' => 'create'],
        ['name' => 'variants.edit',         'display_name' => 'Modifier une variante',       'module' => 'variants',     'action' => 'edit'],
        ['name' => 'variants.delete',       'display_name' => 'Supprimer une variante',      'module' => 'variants',     'action' => 'delete'],

        // Point de vente
        ['name' => 'pos.access',            'display_name' => 'Accéder au POS',              'module' => 'pos',          'action' => 'access'],
        ['name' => 'pos.discount',          'display_name' => 'Appliquer une remise',        'module' => 'pos',          'action' => 'discount'],
        ['name' => 'pos.refund',            'display_name' => 'Effectuer un remboursement',  'module' => 'pos',          'action' => 'refund'],

        // Ventes
        ['name' => 'sales.view',            'display_name' => 'Voir les ventes',             'module' => 'sales',        'action' => 'view'],
        ['name' => 'sales.create',          'display_name' => 'Créer une vente',             'module' => 'sales',        'action' => 'create'],
        ['name' => 'sales.edit',            'display_name' => 'Modifier une vente',          'module' => 'sales',        'action' => 'edit'],
        ['name' => 'sales.delete',          'display_name' => 'Supprimer une vente',         'module' => 'sales',        'action' => 'delete'],
        ['name' => 'sales.pdf',             'display_name' => 'Télécharger une facture PDF', 'module' => 'sales',        'action' => 'pdf'],

        // Retours
        ['name' => 'returns.view',          'display_name' => 'Voir les retours',            'module' => 'returns',      'action' => 'view'],
        ['name' => 'returns.create',        'display_name' => 'Créer un retour',             'module' => 'returns',      'action' => 'create'],

        // Clients
        ['name' => 'customers.view',        'display_name' => 'Voir les clients',            'module' => 'customers',    'action' => 'view'],
        ['name' => 'customers.create',      'display_name' => 'Créer un client',             'module' => 'customers',    'action' => 'create'],
        ['name' => 'customers.edit',        'display_name' => 'Modifier un client',          'module' => 'customers',    'action' => 'edit'],
        ['name' => 'customers.delete',      'display_name' => 'Supprimer un client',         'module' => 'customers',    'action' => 'delete'],

        // Créances
        ['name' => 'debts.view',            'display_name' => 'Voir les créances clients',   'module' => 'debts',        'action' => 'view'],

        // Utilisateurs
        ['name' => 'users.view',            'display_name' => 'Voir les utilisateurs',       'module' => 'users',        'action' => 'view'],
        ['name' => 'users.create',          'display_name' => 'Créer un utilisateur',        'module' => 'users',        'action' => 'create'],
        ['name' => 'users.edit',            'display_name' => 'Modifier un utilisateur',     'module' => 'users',        'action' => 'edit'],
        ['name' => 'users.delete',          'display_name' => 'Supprimer un utilisateur',    'module' => 'users',        'action' => 'delete'],

        // Groupes
        ['name' => 'groups.view',           'display_name' => 'Voir les groupes',            'module' => 'groups',       'action' => 'view'],
        ['name' => 'groups.create',         'display_name' => 'Créer un groupe',             'module' => 'groups',       'action' => 'create'],
        ['name' => 'groups.edit',           'display_name' => 'Modifier un groupe',          'module' => 'groups',       'action' => 'edit'],
        ['name' => 'groups.delete',         'display_name' => 'Supprimer un groupe',         'module' => 'groups',       'action' => 'delete'],

        // Fournisseurs
        ['name' => 'suppliers.view',        'display_name' => 'Voir les fournisseurs',        'module' => 'suppliers',    'action' => 'view'],
        ['name' => 'suppliers.create',      'display_name' => 'Créer un fournisseur',         'module' => 'suppliers',    'action' => 'create'],
        ['name' => 'suppliers.edit',        'display_name' => 'Modifier un fournisseur',      'module' => 'suppliers',    'action' => 'edit'],
        ['name' => 'suppliers.delete',      'display_name' => 'Supprimer un fournisseur',     'module' => 'suppliers',    'action' => 'delete'],

        // Achats
        ['name' => 'purchases.view',        'display_name' => 'Voir les bons de commande',    'module' => 'purchases',    'action' => 'view'],
        ['name' => 'purchases.create',      'display_name' => 'Créer un bon de commande',     'module' => 'purchases',    'action' => 'create'],
        ['name' => 'purchases.edit',        'display_name' => 'Modifier un bon de commande',  'module' => 'purchases',    'action' => 'edit'],
        ['name' => 'purchases.delete',      'display_name' => 'Supprimer un bon de commande', 'module' => 'purchases',    'action' => 'delete'],
        ['name' => 'purchases.receive',     'display_name' => 'Réceptionner une commande',    'module' => 'purchases',    'action' => 'receive'],

        // Facturation
        ['name' => 'invoices.view',         'display_name' => 'Voir les factures',             'module' => 'invoices',     'action' => 'view'],
        ['name' => 'invoices.create',       'display_name' => 'Créer une facture',             'module' => 'invoices',     'action' => 'create'],
        ['name' => 'invoices.edit',         'display_name' => 'Modifier une facture',          'module' => 'invoices',     'action' => 'edit'],
        ['name' => 'invoices.delete',       'display_name' => 'Supprimer une facture',         'module' => 'invoices',     'action' => 'delete'],
        ['name' => 'invoices.pdf',          'display_name' => 'Télécharger une facture PDF',   'module' => 'invoices',     'action' => 'pdf'],

        // Rapports
        ['name' => 'reports.view',          'display_name' => 'Voir les rapports',            'module' => 'reports',      'action' => 'view'],

        // Paramètres
        ['name' => 'settings.view',         'display_name' => 'Voir les paramètres',         'module' => 'settings',     'action' => 'view'],
        ['name' => 'settings.edit',         'display_name' => 'Modifier les paramètres',     'module' => 'settings',     'action' => 'edit'],

        // Boutique en ligne
        ['name' => 'shop.view',             'display_name' => 'Voir la boutique',             'module' => 'shop',         'action' => 'view'],
        ['name' => 'shop.manage',           'display_name' => 'Gérer les paramètres boutique','module' => 'shop',         'action' => 'manage'],
        ['name' => 'shop.orders',           'display_name' => 'Gérer les commandes boutique', 'module' => 'shop',         'action' => 'orders'],
    ];

    public function run(): void
    {
        // Nettoyage des permissions renommées (détacher des groupes avant suppression)
        $obsolete = Permission::whereIn('name', ['customers.debts'])->get();
        foreach ($obsolete as $p) {
            $p->groups()->detach();
            $p->delete();
        }

        foreach (self::$permissions as $data) {
            Permission::firstOrCreate(
                ['name' => $data['name']],
                $data
            );
        }

        $this->command->info('✓ ' . count(self::$permissions) . ' permissions vérifiées/créées.');
    }

    public static function all(): array
    {
        return self::$permissions;
    }
}
