<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            // 0 = illimité, 1+ = limite stricte.
            // Default 1 : les plans existants gardent un comportement mono-succursale.
            $table->smallInteger('max_branches')->default(1)->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('max_branches');
        });
    }
};
