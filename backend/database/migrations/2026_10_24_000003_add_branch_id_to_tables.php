<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Phase 1 — Ajout de branch_id en nullable sur les tables opérationnelles.
     * Phase 2 — Création automatique d'une succursale "Principal" pour chaque tenant existant.
     * Phase 3 — Backfill : rattacher tout l'historique à cette succursale.
     *
     * Pas de contrainte NOT NULL ni de FK dans cette migration —
     * la migration 2026_10_24_000004 les ajoutera après validation en production.
     */
    public function up(): void
    {
        // ── Phase 1 : colonnes nullable ──────────────────────────────────────
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->after('tenant_id')
                ->constrained('branches')->nullOnDelete();
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->after('tenant_id')
                ->constrained('branches')->nullOnDelete();
        });

        Schema::table('pos_sessions', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->after('tenant_id')
                ->constrained('branches')->nullOnDelete();
        });

        Schema::table('sale_returns', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->after('tenant_id')
                ->constrained('branches')->nullOnDelete();
        });

        // ── Phase 2 : succursale "Principal" pour chaque tenant existant ─────
        $tenants = DB::table('tenants')->whereNull('deleted_at')->get(['id']);

        foreach ($tenants as $tenant) {
            // Évite les doublons si la migration est rejouée partiellement.
            $existing = DB::table('branches')
                ->where('tenant_id', $tenant->id)
                ->where('type', 'principal')
                ->value('id');

            if ($existing) {
                $branchId = $existing;
            } else {
                $branchId = DB::table('branches')->insertGetId([
                    'uid'           => (string) Str::uuid(),
                    'tenant_id'     => $tenant->id,
                    'name'          => 'Principal',
                    'type'          => 'principal',
                    'is_active'     => true,
                    'display_order' => 0,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }

            // ── Phase 3 : backfill par chunk de 500 ──────────────────────────
            foreach (['sales', 'stock_movements', 'pos_sessions', 'sale_returns'] as $table) {
                DB::table($table)
                    ->where('tenant_id', $tenant->id)
                    ->whereNull('branch_id')
                    ->orderBy('id')
                    ->chunkById(500, function ($rows) use ($table, $branchId) {
                        $ids = $rows->pluck('id')->all();
                        DB::table($table)->whereIn('id', $ids)->update(['branch_id' => $branchId]);
                    });
            }
        }
    }

    public function down(): void
    {
        Schema::table('sale_returns', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropColumn('branch_id');
        });

        Schema::table('pos_sessions', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropColumn('branch_id');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropColumn('branch_id');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropColumn('branch_id');
        });
    }
};
