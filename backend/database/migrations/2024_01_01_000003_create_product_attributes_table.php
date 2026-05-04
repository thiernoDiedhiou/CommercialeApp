<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_attributes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();

            // Ex: "Taille", "Couleur", "Parfum", "Contenance"
            $table->string('name', 100);

            // Identifiant URL-safe unique par tenant — ex: "taille", "couleur"
            $table->string('slug', 100);

            $table->unsignedTinyInteger('sort_order')->default(0);

            $table->timestamps();

            $table->unique(['tenant_id', 'slug']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_attributes');
    }
};
