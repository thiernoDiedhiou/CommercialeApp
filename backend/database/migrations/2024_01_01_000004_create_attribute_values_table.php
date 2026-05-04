<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attribute_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_attribute_id')
                ->constrained()
                ->cascadeOnDelete();

            // Ex: "S", "M", "L", "XL", "Rouge", "Bleu marine", "500ml"
            $table->string('value', 100);

            // Identifiant URL-safe — ex: "s", "m", "rouge", "bleu-marine"
            $table->string('slug', 100);

            // Optionnel — uniquement pour les attributs de type couleur
            // Format: "#FF0000"
            $table->string('color_hex', 7)->nullable();

            $table->unsignedTinyInteger('sort_order')->default(0);

            $table->timestamps();

            // Deux valeurs identiques autorisées sur des attributs différents
            // (ex: "M" pour Taille et "M" pour Pointure sont distincts)
            $table->unique(['product_attribute_id', 'slug']);
            $table->index('tenant_id');
            $table->index('product_attribute_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attribute_values');
    }
};
