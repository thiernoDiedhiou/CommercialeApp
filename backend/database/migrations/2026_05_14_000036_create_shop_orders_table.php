<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();

            // Référence unique par tenant : CMD-YYYY-XXXXX
            $table->string('reference', 20);
            $table->unique(['tenant_id', 'reference']);

            // Client
            $table->string('customer_name');
            $table->string('customer_phone');
            $table->string('customer_email')->nullable();
            $table->string('customer_address');

            // Livraison
            $table->string('delivery_zone')->nullable();
            $table->decimal('delivery_fee', 12, 2)->default(0);

            // Totaux
            $table->decimal('subtotal', 12, 2);
            $table->decimal('total', 12, 2);

            // Statut commande
            $table->enum('status', ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'])
                  ->default('pending');

            // Paiement — 'paydunya' réservé pour intégration future (non exposé en API pour l'instant)
            $table->enum('payment_method', ['cod', 'whatsapp', 'paydunya'])->default('cod');
            $table->enum('payment_status', ['pending', 'paid'])->default('pending');
            $table->string('paydunya_token')->nullable(); // token Paydunya (feature future)

            $table->text('notes')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_orders');
    }
};
