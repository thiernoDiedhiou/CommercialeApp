<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();

            // Produit optionnel — ligne libre possible (prestation, transport…)
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();

            $table->string('description', 500);       // intitulé de la ligne
            $table->decimal('quantity',   10, 3);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('discount',   15, 2)->default(0); // remise par ligne
            $table->decimal('total',      15, 2);

            $table->timestamps();

            $table->index('invoice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};
