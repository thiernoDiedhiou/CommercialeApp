<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stocke l'URL de checkout retournée par le provider à la création de la charge.
 *
 * Nécessaire pour Bictorys (et tous les providers non-PayDunya) qui n'exposent pas
 * d'endpoint public pour reconstruire l'URL depuis un providerToken.
 * PayDunya : utilisé comme fallback si reconstruction échoue.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->string('checkout_url', 2048)->nullable()->after('provider_token');
        });
    }

    public function down(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->dropColumn('checkout_url');
        });
    }
};
