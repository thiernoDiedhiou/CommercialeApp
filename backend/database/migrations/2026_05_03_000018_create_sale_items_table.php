<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Lignes de vente — pas de tenant_id (scoped via sale_id → tenant)
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();

            // Null si produit sans variante
            $table->foreignId('variant_id')
                ->nullable()
                ->constrained('product_variants')
                ->restrictOnDelete();

            // Null si produit sans gestion de lot
            $table->foreignId('lot_id')
                ->nullable()
                ->constrained('product_lots')
                ->nullOnDelete();

            // ─── Quantité ──────────────────────────────────────────────────
            // DECIMAL(10,3) pour la vente au poids (ex: 1.250 kg)
            $table->decimal('quantity', 10, 3);

            // Poids saisi pour les produits is_weight_based (en kg)
            // quantity = unités, unit_weight = poids par unité (ou poids total saisi)
            $table->decimal('unit_weight', 10, 3)->nullable();

            // ─── Prix — snapshots au moment de la vente ────────────────────
            // Capture le prix réel au moment de la transaction.
            // Ne jamais les recalculer depuis le produit (prix peut changer).
            $table->decimal('unit_price', 12, 2);
            $table->decimal('cost_price', 12, 2)->nullable(); // pour COGS Phase 4

            $table->decimal('discount', 12, 2)->default(0);   // remise sur la ligne
            $table->decimal('total', 12, 2);                  // (unit_price × quantity) - discount

            $table->timestamps();

            // ─── Index ─────────────────────────────────────────────────────
            $table->index('sale_id');
            $table->index('product_id');
            $table->index('variant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
    }
};
