<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();

            // ── Identité ─────────────────────────────────────────────────────
            $table->string('name', 100);                   // "Starter"
            $table->string('slug', 100)->unique();          // "starter"
            $table->string('tagline', 255)->nullable();     // "Parfait pour démarrer"
            $table->string('badge', 50)->nullable();        // "Populaire" | null
            $table->text('description')->nullable();        // description longue
            $table->json('features')->nullable();           // bullet points configurables
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_public')->default(true);   // visible sur page tarifs

            // ── Tarification (XOF — entiers en pratique, décimal pour flex devise) ──
            $table->decimal('price_monthly', 12, 2);
            $table->decimal('price_yearly', 12, 2)->nullable();    // null = non disponible
            $table->unsignedTinyInteger('yearly_discount_pct')->nullable(); // ex: 16
            $table->unsignedTinyInteger('trial_days')->default(21);

            // ── Limites quantitatives (0 = illimité) ─────────────────────────
            $table->unsignedSmallInteger('max_users')->default(0);
            $table->unsignedSmallInteger('max_products')->default(0);
            $table->unsignedInteger('max_monthly_sales')->default(0);

            // ── Feature flags — modules fonctionnels ─────────────────────────
            $table->boolean('feature_pos')->default(true);
            $table->boolean('feature_invoicing')->default(false);
            $table->boolean('feature_purchases')->default(false);
            $table->boolean('feature_reports')->default(false);
            $table->boolean('feature_shop')->default(false);
            $table->boolean('feature_import_csv')->default(false);
            $table->boolean('feature_stock_alerts')->default(false);
            $table->boolean('feature_multi_user')->default(false);

            // ── Hébergement boutique ─────────────────────────────────────────
            // Sous-domaine (slug.votreapp.sn) = standard pour tous les plans en prod
            // Domaine personnalisé = option Premium (Business uniquement)
            $table->boolean('feature_custom_domain')->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
