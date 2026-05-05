<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();

            // Format : FAC-YYYY-XXXXX — unique par tenant
            $table->string('reference', 30);

            // draft → sent → paid | overdue | cancelled
            $table->string('status', 20)->default('draft');

            $table->date('issue_date');                 // date d'émission
            $table->date('due_date')->nullable();        // date d'échéance

            // Montants (bcmath côté service)
            $table->decimal('subtotal',        15, 2)->default(0);
            $table->string('discount_type', 10)->nullable(); // 'percent' | 'fixed'
            $table->decimal('discount_value',  15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_rate',         5, 2)->default(0); // taux TVA en %
            $table->decimal('tax_amount',      15, 2)->default(0);
            $table->decimal('total',           15, 2)->default(0);
            $table->decimal('paid_amount',     15, 2)->default(0);

            $table->text('notes')->nullable();   // notes internes
            $table->text('footer')->nullable();  // conditions de paiement, mentions légales

            $table->timestamp('sent_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'reference']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'customer_id']);
            $table->index(['tenant_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
