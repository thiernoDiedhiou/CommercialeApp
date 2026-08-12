<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            // Référence facture lisible : ABN-2026-00001
            // Générée automatiquement à la complétion du paiement.
            $table->string('invoice_number', 20)->nullable()->unique()->after('idempotency_key');
        });
    }

    public function down(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->dropColumn('invoice_number');
        });
    }
};
