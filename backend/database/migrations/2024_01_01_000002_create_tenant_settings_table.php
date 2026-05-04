<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();

            // Clé de configuration (ex: "pos.receipt_footer", "stock.low_stock_threshold")
            $table->string('key', 100);

            // Valeur sérialisée — le type indique comment désérialiser
            $table->text('value')->nullable();

            // Type de valeur pour cast correct à la lecture
            // Valeurs: string | boolean | integer | float | json | array
            $table->string('type', 20)->default('string');

            // Groupe logique pour affichage UI (pos, stock, invoice, notifications…)
            $table->string('group', 50)->default('general');

            $table->timestamps();

            $table->unique(['tenant_id', 'key']);
            $table->index(['tenant_id', 'group']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_settings');
    }
};
