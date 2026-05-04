<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Utilisé uniquement quand products.has_expiry = true
        // Secteurs: cosmétique, alimentaire, pharmacie
        Schema::create('product_lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();

            // Null si le produit n'a pas de variantes
            $table->foreignId('product_variant_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            // ─── Identification du lot ─────────────────────────────────────
            // Numéro de lot tel qu'imprimé sur l'emballage — traçabilité
            $table->string('lot_number', 100);

            // Null autorisé pour les produits sans date d'expiration obligatoire
            $table->date('expiry_date')->nullable();

            // ─── Quantités ─────────────────────────────────────────────────
            // Quantité reçue à la réception du lot
            $table->unsignedInteger('quantity_received')->default(0);

            // Quantité restante — décrémentée à chaque vente de ce lot
            // Géré par StockService — jamais modifié directement
            $table->unsignedInteger('quantity_remaining')->default(0);

            // ─── Coût d'achat ──────────────────────────────────────────────
            // Prix d'achat unitaire au moment de la réception
            // Peut varier d'un lot à l'autre (inflation, fournisseur différent)
            $table->decimal('purchase_price', 12, 2)->nullable();

            // ─── Statut ────────────────────────────────────────────────────
            // false = lot épuisé ou archivé manuellement
            $table->boolean('is_active')->default(true);

            $table->text('notes')->nullable();

            $table->timestamps();

            // ─── Index ─────────────────────────────────────────────────────
            // Recherche des lots proches de l'expiration (alertes quotidiennes)
            $table->index(['tenant_id', 'expiry_date']);
            $table->index(['tenant_id', 'product_id']);
            $table->index(['tenant_id', 'is_active']);
            $table->index('product_variant_id');
            $table->index(['tenant_id', 'lot_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_lots');
    }
};
