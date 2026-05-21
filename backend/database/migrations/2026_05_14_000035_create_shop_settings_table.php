<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained()->cascadeOnDelete();

            $table->boolean('is_active')->default(false);

            // Identité boutique
            $table->string('shop_name')->nullable();
            $table->text('shop_description')->nullable();
            $table->string('hero_title')->nullable();
            $table->string('hero_subtitle')->nullable();
            $table->string('hero_banner_path')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('favicon_url')->nullable();

            // Charte graphique (null = hérite du tenant)
            $table->string('primary_color', 7)->nullable();
            $table->string('secondary_color', 7)->nullable();
            $table->string('accent_color', 7)->nullable();

            // Contact & réseaux sociaux
            $table->string('whatsapp_number')->nullable();
            $table->string('facebook_url')->nullable();
            $table->string('instagram_url')->nullable();
            $table->string('twitter_url')->nullable();
            $table->string('address')->nullable();
            $table->string('opening_hours')->nullable();

            // Commandes & livraison
            $table->decimal('minimum_order', 12, 2)->default(0);
            $table->json('delivery_zones')->nullable();
            $table->json('payment_methods')->nullable();

            // Barre d'annonce
            $table->string('announcement_bar')->nullable();
            $table->boolean('announcement_bar_active')->default(false);

            // Footer & SEO
            $table->string('footer_text')->nullable();
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('google_analytics_id')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_settings');
    }
};
