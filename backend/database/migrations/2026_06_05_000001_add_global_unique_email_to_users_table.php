<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sécurité : bloquer la migration si des doublons email existent entre tenants.
        $duplicates = DB::table('users')
            ->select('email', DB::raw('COUNT(*) as total'))
            ->groupBy('email')
            ->having('total', '>', 1)
            ->pluck('email');

        if ($duplicates->isNotEmpty()) {
            throw new \RuntimeException(
                'Migration annulée — emails dupliqués entre tenants : ' . $duplicates->implode(', ') . "\n"
                . 'Résolvez les doublons avant de relancer la migration.'
            );
        }

        Schema::table('users', function (Blueprint $table) {
            // Remplace unique(tenant_id, email) par unique(email) global.
            // Un email = une seule identité sur toute la plateforme → login email+mdp sans contexte tenant.
            $table->dropUnique(['tenant_id', 'email']);
            $table->unique('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['email']);
            $table->unique(['tenant_id', 'email']);
        });
    }
};
