<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Les permissions sont globales — pas de tenant_id.
        // Elles définissent le catalogue des actions possibles dans la plateforme.
        // Les groupes (par tenant) y sont associés via group_permissions.
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();

            // Ex: "products.create", "pos.access", "settings.edit"
            $table->string('name', 100)->unique();

            // Label affiché dans l'UI de gestion des groupes
            $table->string('display_name', 150);

            // Module fonctionnel — pour regrouper l'affichage UI
            // Ex: "products", "pos", "sales", "settings"
            $table->string('module', 50);

            // Action au sein du module — "view", "create", "edit", "delete", "access"…
            $table->string('action', 50);

            $table->timestamps();

            $table->index('module');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
