<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();

            // Null si le produit n'a pas de variantes (has_variants = false)
            $table->foreignId('product_variant_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            // Null si pas de gestion par lot (has_expiry = false)
            $table->foreignId('lot_id')
                ->nullable()
                ->constrained('product_lots')
                ->nullOnDelete();

            // ─── Type de mouvement ─────────────────────────────────────────
            // in         → entrée : achat, réception fournisseur
            // out        → sortie : vente, perte, destruction
            // adjustment → correction manuelle d'inventaire
            // return     → retour client (remet en stock)
            $table->enum('type', ['in', 'out', 'adjustment', 'return']);

            // Quantité TOUJOURS positive — le type détermine le sens
            // DECIMAL(10,3) pour la vente au poids (ex: 1.250 kg)
            $table->decimal('quantity', 10, 3);

            // ─── Snapshot stock ────────────────────────────────────────────
            // Stock avant et après le mouvement — auditabilité complète
            // Permet de reconstruire l'historique sans recalcul
            $table->decimal('stock_before', 10, 3)->default(0);
            $table->decimal('stock_after', 10, 3)->default(0);

            // ─── Origine du mouvement ──────────────────────────────────────
            // source    : "sale" | "purchase" | "manual" | "pos" | "return"
            // source_id : ID de la vente, du bon de commande, etc.
            $table->string('source', 50)->default('manual');
            $table->unsignedBigInteger('source_id')->nullable();

            // ─── Coût ──────────────────────────────────────────────────────
            // Coût unitaire au moment du mouvement
            // Utilisé pour le calcul du COGS en Phase 4
            $table->decimal('unit_cost', 12, 2)->nullable();

            // ─── Acteur ────────────────────────────────────────────────────
            $table->unsignedBigInteger('user_id')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            // ─── Index ─────────────────────────────────────────────────────
            $table->index(['tenant_id', 'product_id']);
            $table->index(['tenant_id', 'product_variant_id']);
            $table->index(['tenant_id', 'lot_id']);
            $table->index(['tenant_id', 'type']);

            // Index temporel pour rapports et exports
            $table->index(['tenant_id', 'created_at']);

            // Recherche par source pour éviter les doublons (idempotence)
            $table->index(['source', 'source_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
