<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();

            // Moyen de paiement
            // mobile_money : Wave, Orange Money, Free Money (Sénégal)
            // credit       : vente à crédit — montant dû enregistré
            $table->enum('method', [
                'cash',
                'card',
                'transfer',
                'mobile_money',
                'credit',
            ]);

            $table->decimal('amount', 12, 2);

            // Référence externe optionnelle (numéro Wave, reçu bancaire…)
            $table->string('reference', 100)->nullable();

            // Date effective du paiement (peut différer de created_at pour les crédits)
            $table->timestamp('paid_at');

            $table->timestamps();

            // ─── Index ─────────────────────────────────────────────────────
            $table->index(['tenant_id', 'sale_id']);
            $table->index(['tenant_id', 'method']);
            $table->index(['tenant_id', 'paid_at']); // rapports par méthode et période
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
