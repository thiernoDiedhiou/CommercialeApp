<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            // ── Starter ───────────────────────────────────────────────────────
            // Inclut : POS, Facturation, Achats, Multi-utilisateurs
            // Limites : 2 users · 100 produits · 200 ventes/mois
            [
                'name'                 => 'Starter',
                'slug'                 => 'starter',
                'tagline'              => 'Parfait pour démarrer',
                'badge'                => null,
                'description'          => 'Idéal pour les petits commerces qui souhaitent digitaliser leur caisse, leur facturation et leurs achats.',
                'features'             => [
                    'Caisse POS complète',
                    'Facturation clients (PDF + envoi email)',
                    'Gestion des achats et fournisseurs',
                    'Jusqu\'à 2 utilisateurs avec groupes et permissions',
                    'Jusqu\'à 100 produits',
                    '200 ventes par mois',
                    'Gestion des stocks',
                    'Boutique sur sous-domaine (slug.votreapp.sn)',
                    'Support par email',
                ],
                'sort_order'           => 1,
                'is_active'            => true,
                'is_public'            => true,
                'price_monthly'        => 9900.00,
                'price_yearly'         => 99000.00,
                'yearly_discount_pct'  => 16,
                'trial_days'           => 21,
                'max_users'            => 2,
                'max_products'         => 100,
                'max_monthly_sales'    => 200,
                'feature_pos'          => true,
                'feature_invoicing'    => true,
                'feature_purchases'    => true,
                'feature_reports'      => false,
                'feature_shop'         => false,
                'feature_import_csv'   => false,
                'feature_stock_alerts' => false,
                'feature_multi_user'   => true,
                'feature_custom_domain'=> false,
            ],

            // ── Pro ───────────────────────────────────────────────────────────
            // Ajoute au Starter : Rapports, Import CSV, Alertes email, Boutique en ligne
            // Limites : 5 users · 500 produits · ventes illimitées
            [
                'name'                 => 'Pro',
                'slug'                 => 'pro',
                'tagline'              => 'Pour les PME en croissance',
                'badge'                => 'Populaire',
                'description'          => 'Toutes les fonctionnalités Starter, plus les rapports d\'analyse, les alertes stock, l\'import CSV et la boutique en ligne.',
                'features'             => [
                    'Tout ce qui est dans Starter',
                    'Jusqu\'à 5 utilisateurs',
                    'Jusqu\'à 500 produits',
                    'Ventes illimitées',
                    'Rapports et export CSV',
                    'Import CSV produits',
                    'Alertes email stock',
                    'Boutique en ligne (slug.votreapp.sn)',
                    'Support prioritaire',
                ],
                'sort_order'           => 2,
                'is_active'            => true,
                'is_public'            => true,
                'price_monthly'        => 24900.00,
                'price_yearly'         => 249000.00,
                'yearly_discount_pct'  => 17,
                'trial_days'           => 21,
                'max_users'            => 5,
                'max_products'         => 500,
                'max_monthly_sales'    => 0,
                'feature_pos'          => true,
                'feature_invoicing'    => true,
                'feature_purchases'    => true,
                'feature_reports'      => true,
                'feature_shop'         => true,
                'feature_import_csv'   => true,
                'feature_stock_alerts' => true,
                'feature_multi_user'   => true,
                'feature_custom_domain'=> false,
            ],

            // ── Business ──────────────────────────────────────────────────────
            [
                'name'                 => 'Business',
                'slug'                 => 'business',
                'tagline'              => 'Commerce multi-canal complet',
                'badge'                => 'Complet',
                'description'          => 'La solution complète pour les commerces ambitieux : boutique en ligne, domaine personnalisé et utilisateurs illimités.',
                'features'             => [
                    'Tout ce qui est dans Pro',
                    'Utilisateurs illimités',
                    'Produits illimités',
                    'Boutique en ligne publique complète',
                    'Tableau de bord multi-canal (POS + boutique)',
                    'Domaine personnalisé (votre-boutique.sn)',
                    'Support dédié',
                ],
                'sort_order'           => 3,
                'is_active'            => true,
                'is_public'            => true,
                'price_monthly'        => 49900.00,
                'price_yearly'         => 499000.00,
                'yearly_discount_pct'  => 17,
                'trial_days'           => 21,
                'max_users'            => 0,
                'max_products'         => 0,
                'max_monthly_sales'    => 0,
                'feature_pos'          => true,
                'feature_invoicing'    => true,
                'feature_purchases'    => true,
                'feature_reports'      => true,
                'feature_shop'         => true,
                'feature_import_csv'   => true,
                'feature_stock_alerts' => true,
                'feature_multi_user'   => true,
                'feature_custom_domain'=> true,
            ],
        ];

        foreach ($plans as $data) {
            Plan::updateOrCreate(['slug' => $data['slug']], $data);
        }

        $this->command->info('✓ 3 plans créés : Starter / Pro / Business');
    }
}
