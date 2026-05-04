<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Table pivot : une variante possède N valeurs d'attributs
        // Ex: variant "Polo M Rouge" → [Taille: M] + [Couleur: Rouge]
        Schema::create('product_variant_attribute_values', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_variant_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('attribute_value_id')
                ->constrained()
                ->cascadeOnDelete();

            // Une variante ne peut pas avoir deux fois le même attribut-valeur
            $table->unique(
                ['product_variant_id', 'attribute_value_id'],
                'pvav_variant_value_unique'
            );

            $table->index('attribute_value_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variant_attribute_values');
    }
};
