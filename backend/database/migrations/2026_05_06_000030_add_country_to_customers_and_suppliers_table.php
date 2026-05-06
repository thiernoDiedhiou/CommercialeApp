<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // Code pays ISO 3166-1 alpha-2 — défaut Sénégal
            $table->string('country', 2)->default('SN')->after('phone');
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('country', 2)->default('SN')->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('country');
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn('country');
        });
    }
};
