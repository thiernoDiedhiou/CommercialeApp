<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')
                ->constrained()
                ->cascadeOnDelete();

            // ─── Identification du SKU ─────────────────────────────────────
            // Ex: "POLO-ROUGE-M", "CREME-50ML-LAVANDE"
            $table->string('sku', 100);
            $table->string('barcode', 100)->nullable();

            // ─── Tarification (override le produit parent) ─────────────────
            $table->decimal('price', 12, 2);
            $table->decimal('cost_price', 12, 2)->nullable();

            // ─── Stock ─────────────────────────────────────────────────────
            // Géré par variante — stock_movements pointe sur variant_id
            $table->integer('stock_quantity')->default(0);

            // Si null → hérite de products.alert_threshold
            $table->unsignedInteger('alert_threshold')->nullable();

            // ─── Résumé lisible des attributs ─────────────────────────────
            // Généré à la création/modification — ex: "M / Rouge"
            // Evite des JOIN au moment de l'affichage POS
            $table->string('attribute_summary', 255)->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            // ─── Index ─────────────────────────────────────────────────────
            $table->unique(['tenant_id', 'sku']);
            $table->index(['tenant_id', 'product_id']);
            $table->index(['product_id', 'is_active']);
            $table->index(['tenant_id', 'barcode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
