<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('expected_qty', 12, 3)->default(0);
            $table->decimal('counted_qty', 12, 3)->default(0);
            $table->timestamps();

            $table->unique(['inventory_session_id', 'product_id', 'variant_id'], 'inv_items_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
