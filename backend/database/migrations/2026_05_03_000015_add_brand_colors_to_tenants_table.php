<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Couleurs de marque pour personnalisation UI par tenant
            $table->string('primary_color', 7)->default('#4F46E5')->after('logo_path');
            $table->string('secondary_color', 7)->default('#7C3AED')->after('primary_color');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['primary_color', 'secondary_color']);
        });
    }
};
