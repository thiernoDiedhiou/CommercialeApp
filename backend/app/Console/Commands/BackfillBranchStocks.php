<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillBranchStocks extends Command
{
    protected $signature = 'branch-stocks:backfill
                            {--tenant= : Limiter à un tenant (slug)}
                            {--force : Écraser les lignes existantes (updateOrInsert)}';

    protected $description = 'Peuple branch_stocks depuis products/product_variants pour chaque succursale principale';

    public function handle(): int
    {
        $tenantSlug = $this->option('tenant');
        $force = $this->option('force');

        $tenantsQuery = DB::table('tenants')->whereNull('deleted_at');
        if ($tenantSlug) {
            $tenantsQuery->where('slug', $tenantSlug);
        }
        $tenants = $tenantsQuery->get(['id', 'slug']);

        if ($tenants->isEmpty()) {
            $this->error('Aucun tenant trouvé.');
            return self::FAILURE;
        }

        foreach ($tenants as $tenant) {
            $this->info("Tenant : {$tenant->slug}");

            $principalBranchId = DB::table('branches')
                ->where('tenant_id', $tenant->id)
                ->where('type', 'principal')
                ->value('id');

            if (! $principalBranchId) {
                $this->warn("  → Pas de succursale principale, ignoré.");
                continue;
            }

            $this->line("  Succursale principale : #{$principalBranchId}");

            // ── Produits sans variantes ──────────────────────────────────────
            $inserted = 0;
            DB::table('products')
                ->where('tenant_id', $tenant->id)
                ->whereNull('deleted_at')
                ->where('has_variants', false)
                ->orderBy('id')
                ->chunkById(500, function ($products) use ($tenant, $principalBranchId, $force, &$inserted) {
                    foreach ($products as $p) {
                        if ($force) {
                            DB::table('branch_stocks')->updateOrInsert(
                                [
                                    'branch_id' => $principalBranchId,
                                    'product_id' => $p->id,
                                    'product_variant_id' => 0,
                                ],
                                [
                                    'tenant_id' => $tenant->id,
                                    'quantity' => max(0, $p->stock_quantity ?? 0),
                                    'updated_at' => now(),
                                    'created_at' => now(),
                                ],
                            );
                        } else {
                            DB::table('branch_stocks')->insertOrIgnore([
                                'tenant_id' => $tenant->id,
                                'branch_id' => $principalBranchId,
                                'product_id' => $p->id,
                                'product_variant_id' => 0,
                                'quantity' => max(0, $p->stock_quantity ?? 0),
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                        $inserted++;
                    }
                });

            // ── Variantes ────────────────────────────────────────────────────
            $productIds = DB::table('products')
                ->where('tenant_id', $tenant->id)
                ->whereNull('deleted_at')
                ->pluck('id')
                ->all();

            if (! empty($productIds)) {
                DB::table('product_variants')
                    ->whereIn('product_id', $productIds)
                    ->orderBy('id')
                    ->chunkById(500, function ($variants) use ($tenant, $principalBranchId, $force, &$inserted) {
                        foreach ($variants as $v) {
                            if ($force) {
                                DB::table('branch_stocks')->updateOrInsert(
                                    [
                                        'branch_id' => $principalBranchId,
                                        'product_id' => $v->product_id,
                                        'product_variant_id' => $v->id,
                                    ],
                                    [
                                        'tenant_id' => $tenant->id,
                                        'quantity' => max(0, $v->stock_quantity ?? 0),
                                        'updated_at' => now(),
                                        'created_at' => now(),
                                    ],
                                );
                            } else {
                                DB::table('branch_stocks')->insertOrIgnore([
                                    'tenant_id' => $tenant->id,
                                    'branch_id' => $principalBranchId,
                                    'product_id' => $v->product_id,
                                    'product_variant_id' => $v->id,
                                    'quantity' => max(0, $v->stock_quantity ?? 0),
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            }
                            $inserted++;
                        }
                    });
            }

            $this->info("  → {$inserted} entrées insérées/mises à jour.");
        }

        $this->info('Backfill terminé.');
        return self::SUCCESS;
    }
}
