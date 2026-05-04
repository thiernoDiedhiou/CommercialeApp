<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();

            // category_id — FK vers categories (table créée plus tard)
            // Nullable pour ne pas bloquer les migrations en Phase 1
            $table->unsignedBigInteger('category_id')->nullable();

            // ─── Identification ────────────────────────────────────────────
            $table->string('name', 255);
            $table->string('slug', 255);
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();

            // SKU/code-barres du produit parent (utilisé si has_variants = false)
            $table->string('sku', 100)->nullable();
            $table->string('barcode', 100)->nullable();

            // ─── Tarification (produit sans variante) ─────────────────────
            // Prix de vente TTC en XOF (ou devise tenant)
            $table->decimal('price', 12, 2)->default(0);

            // Prix d'achat — pour calcul marge (Phase 4)
            $table->decimal('cost_price', 12, 2)->nullable();

            // ─── Comportements sectoriels ──────────────────────────────────
            // TRUE  → les prix et stocks sont portés par product_variants
            // FALSE → prix/stock directement sur ce modèle
            $table->boolean('has_variants')->default(false);

            // TRUE → secteur alimentaire : quantité = poids saisi (kg/g)
            // FALSE → vente à l'unité
            $table->boolean('is_weight_based')->default(false);

            // TRUE → suivi date d'expiration via product_lots
            // Activé automatiquement pour cosmétique et alimentaire
            $table->boolean('has_expiry')->default(false);

            // ─── Stock & alertes (produit sans variante uniquement) ────────
            $table->integer('stock_quantity')->default(0);

            // Seuil d'alerte stock bas — 0 = pas d'alerte
            $table->unsignedInteger('alert_threshold')->default(5);

            // Unité d'affichage : "unité", "kg", "g", "L", "ml", "paire"…
            $table->string('unit', 20)->default('unité');

            // ─── Statut ────────────────────────────────────────────────────
            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->softDeletes();

            // ─── Index ─────────────────────────────────────────────────────
            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'has_variants']);
            $table->index(['tenant_id', 'category_id']);
            $table->index(['tenant_id', 'barcode']);
            $table->index(['tenant_id', 'sku']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
