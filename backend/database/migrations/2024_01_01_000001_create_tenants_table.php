<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();

            // Identification
            $table->string('name');
            $table->string('slug')->unique();        // identifiant URL-safe unique
            $table->string('api_key', 64)->unique(); // clé envoyée via X-Tenant-ID

            // Secteur d'activité — détermine le comportement de la plateforme
            // Valeurs: general | fashion | cosmetic | food
            $table->string('sector', 30)->default('general');

            // Localisation & devise
            $table->string('currency', 3)->default('XOF');
            $table->string('locale', 5)->default('fr');
            $table->string('timezone', 50)->default('Africa/Dakar');

            // Coordonnées du commerce
            $table->string('phone', 30)->nullable();
            $table->string('email', 191)->nullable();
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('country', 100)->default('Sénégal');

            // Logo (chemin storage relatif)
            $table->string('logo_path')->nullable();

            // Statut & abonnement
            $table->boolean('is_active')->default(true);
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('subscription_ends_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Index pour les requêtes fréquentes
            $table->index('api_key');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
