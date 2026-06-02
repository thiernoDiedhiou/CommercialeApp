<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_subscriptions', function (Blueprint $table) {
            $table->id();

            // ── Relations ─────────────────────────────────────────────────────
            $table->foreignId('tenant_id')
                  ->constrained()
                  ->cascadeOnDelete();

            $table->foreignId('plan_id')
                  ->constrained()
                  ->restrictOnDelete(); // Empêche la suppression d'un plan actif

            // ── Cycle de facturation ──────────────────────────────────────────
            $table->enum('billing_cycle', ['trial', 'monthly', 'yearly', 'lifetime'])
                  ->default('trial');

            // ── Statut ────────────────────────────────────────────────────────
            // trial    → période d'essai en cours
            // active   → abonnement payant actif
            // expired  → délai dépassé, tenant suspendu automatiquement
            // cancelled → résilié manuellement par le Super Admin
            $table->enum('status', ['trial', 'active', 'expired', 'cancelled'])
                  ->default('trial');

            // ── Dates ─────────────────────────────────────────────────────────
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();        // null = lifetime

            // ── Notifications d'expiration ────────────────────────────────────
            // Stocke les jours déjà notifiés (ex: [7, 1]) pour éviter les doublons
            $table->json('notified_at_days')->nullable();

            // ── Notes internes Super Admin ────────────────────────────────────
            $table->text('notes')->nullable();

            $table->timestamps();

            // ── Index ─────────────────────────────────────────────────────────
            $table->index(['tenant_id', 'status']);
            $table->index(['status', 'ends_at']); // pour la commande subscription:expire
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_subscriptions');
    }
};
