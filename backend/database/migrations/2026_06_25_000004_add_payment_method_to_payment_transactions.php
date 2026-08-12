<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            // Label lisible du moyen de paiement réel confirmé par le provider
            // Ex : "Orange Money", "Wave", "Mastercard ****4467"
            // Renseigné par le gateway lors du parsing du webhook.
            $table->string('payment_method_label', 60)->nullable()->after('provider_token');
        });
    }

    public function down(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->dropColumn('payment_method_label');
        });
    }
};
