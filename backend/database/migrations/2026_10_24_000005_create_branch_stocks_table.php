<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Crée la table branch_stocks — stock par succursale.
     *
     * product_variant_id stocké en BIGINT (0 = pas de variante) pour permettre
     * une contrainte UNIQUE sans problème de NULL dans MySQL 8.
     *
     * Après création, backfill depuis products/product_variants :
     *   → stock existant attribué à la succursale principale du tenant.
     */
    public function up(): void
    {
        Schema::create('branch_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            // 0 = pas de variante — évite le problème NULL dans UNIQUE MySQL
            $table->unsignedBigInteger('product_variant_id')->default(0);
            $table->decimal('quantity', 12, 3)->default(0);
            $table->timestamps();

            $table->unique(
                ['branch_id', 'product_id', 'product_variant_id'],
                'branch_stocks_unique',
            );
            $table->index(['tenant_id', 'branch_id'], 'branch_stocks_tenant_branch');
        });

        // ── Backfill : stock initial sur la succursale principale ────────────
        $tenants = DB::table('tenants')->whereNull('deleted_at')->get(['id']);

        foreach ($tenants as $tenant) {
            $principalBranchId = DB::table('branches')
                ->where('tenant_id', $tenant->id)
                ->where('type', 'principal')
                ->value('id');

            if (! $principalBranchId) {
                continue;
            }

            // Produits sans variantes
            DB::table('products')
                ->where('tenant_id', $tenant->id)
                ->whereNull('deleted_at')
                ->where('has_variants', false)
                ->orderBy('id')
                ->chunkById(500, function ($products) use ($tenant, $principalBranchId) {
                    $rows = [];
                    foreach ($products as $p) {
                        $rows[] = [
                            'tenant_id' => $tenant->id,
                            'branch_id' => $principalBranchId,
                            'product_id' => $p->id,
                            'product_variant_id' => 0,
                            'quantity' => max(0, $p->stock_quantity ?? 0),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                    if ($rows) {
                        DB::table('branch_stocks')->insertOrIgnore($rows);
                    }
                });

            // Variantes — on passe par les product_ids du tenant pour éviter les problèmes
            // de chunkById avec JOIN (alias de colonne)
            $productIds = DB::table('products')
                ->where('tenant_id', $tenant->id)
                ->whereNull('deleted_at')
                ->pluck('id')
                ->all();

            if (! empty($productIds)) {
                DB::table('product_variants')
                    ->whereIn('product_id', $productIds)
                    ->orderBy('id')
                    ->select(['id', 'product_id', 'stock_quantity'])
                    ->chunkById(500, function ($variants) use ($tenant, $principalBranchId) {
                        $rows = [];
                        foreach ($variants as $v) {
                            $rows[] = [
                                'tenant_id' => $tenant->id,
                                'branch_id' => $principalBranchId,
                                'product_id' => $v->product_id,
                                'product_variant_id' => $v->id,
                                'quantity' => max(0, $v->stock_quantity ?? 0),
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                        if ($rows) {
                            DB::table('branch_stocks')->insertOrIgnore($rows);
                        }
                    });
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_stocks');
    }
};
