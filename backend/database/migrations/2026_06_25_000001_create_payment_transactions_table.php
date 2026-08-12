<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();

            // ── Clé d'idempotence ─────────────────────────────────────────────
            // Format : {tenant_id}-{plan_id}-{billing_cycle}-{YYYYMM}
            // Garantit qu'un tenant ne peut pas être facturé deux fois pour la
            // même période, même en cas de double-clic ou de retry réseau.
            $table->string('idempotency_key', 128)->unique();

            // ── Relations ─────────────────────────────────────────────────────
            $table->foreignId('tenant_id')
                  ->constrained()
                  ->cascadeOnDelete();

            $table->foreignId('plan_id')
                  ->nullable()                    // null si paiement hors-plan
                  ->constrained()
                  ->nullOnDelete();

            // ── Provider de paiement ──────────────────────────────────────────
            // Permet de supporter plusieurs providers sans modifier le schéma.
            $table->string('provider', 30)->default('paydunya');

            // Token / référence retourné par le provider après création de facture
            $table->string('provider_token', 255)->nullable()->index();

            // ── Montant & devise ──────────────────────────────────────────────
            $table->enum('billing_cycle', ['monthly', 'yearly'])->nullable();
            $table->unsignedBigInteger('amount');      // entier (XOF, XAF, GNF — pas de décimales)
            $table->string('currency', 3)->default('XOF');

            // ── Machine d'états ───────────────────────────────────────────────
            // pending   → lien créé, paiement pas encore confirmé
            // completed → webhook confirmé + signature vérifiée + abonnement activé
            // failed    → paiement refusé ou expiré
            // cancelled → annulé par le tenant avant paiement
            $table->enum('status', ['pending', 'completed', 'failed', 'cancelled'])
                  ->default('pending')
                  ->index();

            // ── Expiration du lien de paiement ────────────────────────────────
            // Après cette date, un lien "pending" est considéré abandonné.
            $table->timestamp('expires_at')->nullable();

            // ── Audit ─────────────────────────────────────────────────────────
            // Stocke le payload brut du webhook pour débogage et conformité.
            // Jamais modifié après écriture (journal append-only).
            $table->json('webhook_payload')->nullable();

            // Référence de l'abonnement activé après paiement (traçabilité)
            $table->foreignId('subscription_id')
                  ->nullable()
                  ->constrained('tenant_subscriptions')
                  ->nullOnDelete();

            $table->timestamps();

            // ── Index composites ──────────────────────────────────────────────
            $table->index(['tenant_id', 'status']);
            $table->index(['provider', 'provider_token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
};
