<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Ajoute la colonne si elle n'existe pas encore (migration de rattrapage)
            if (! Schema::hasColumn('products', 'category_id')) {
                $table->foreignId('category_id')->nullable()->after('tenant_id')->constrained('categories')->nullOnDelete();
            } else {
                // Colonne existante — ajoute seulement la contrainte FK
                $table->foreign('category_id')->references('id')->on('categories')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
        });
    }
};
