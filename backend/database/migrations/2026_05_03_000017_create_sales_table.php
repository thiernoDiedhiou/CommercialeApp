<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();

            // Client optionnel — vente anonyme autorisée au POS
            $table->foreignId('customer_id')
                ->nullable()
                ->constrained('customers')
                ->nullOnDelete();

            // Vendeur ayant créé la vente
            $table->unsignedBigInteger('user_id');

            // ─── Référence ─────────────────────────────────────────────────
            // Format : VNT-2026-00001 — unique par tenant, générée par SaleService
            $table->string('reference', 30);

            // ─── Calculs financiers ────────────────────────────────────────
            // Tous les montants en XOF (ou devise du tenant)
            $table->decimal('subtotal', 12, 2)->default(0);       // somme lignes brute

            $table->enum('discount_type', ['percent', 'fixed'])->nullable();
            $table->decimal('discount_value', 10, 2)->default(0); // saisie UI : % ou montant
            $table->decimal('discount_amount', 12, 2)->default(0);// montant calculé
            $table->decimal('tax_amount', 12, 2)->default(0);     // TVA si applicable

            $table->decimal('total', 12, 2)->default(0);          // = subtotal - discount + tax

            // ─── Statut ────────────────────────────────────────────────────
            // draft     : panier en cours, stock non décrémenté
            // confirmed : vente validée, stock décrémenté
            // cancelled : annulée, stock restitué si confirmed avant
            $table->enum('status', ['draft', 'confirmed', 'cancelled'])->default('draft');

            $table->text('note')->nullable();

            // Dates de transition de statut — pour audit et rapports
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->timestamps();

            // ─── Index ─────────────────────────────────────────────────────
            $table->unique(['tenant_id', 'reference']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'customer_id']);
            $table->index(['tenant_id', 'user_id']);
            $table->index(['tenant_id', 'confirmed_at']); // rapports par période
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
