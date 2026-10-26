<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_images', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uid')->unique();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('disk_path');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Backfill : copier les image_path existants vers product_images
        DB::table('products')
            ->whereNotNull('image_path')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->each(function (object $product): void {
                DB::table('product_images')->insert([
                    'uid'        => (string) Str::uuid(),
                    'product_id' => $product->id,
                    'tenant_id'  => $product->tenant_id,
                    'disk_path'  => $product->image_path,
                    'sort_order' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
