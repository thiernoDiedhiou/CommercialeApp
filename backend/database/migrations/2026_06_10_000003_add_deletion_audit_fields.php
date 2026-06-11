<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Champs d'audit RGPD sur la table tenants
        Schema::table('tenants', function (Blueprint $table) {
            $table->timestamp('deletion_requested_at')->nullable()->after('scheduled_deletion_at');
            $table->string('deletion_requested_by')->nullable()->after('deletion_requested_at')
                  ->comment('Nom + email du Super Admin ayant programmé la suppression');
        });

        // Délai de grâce configurable dans les paramètres du site (défaut 30 jours)
        Schema::table('site_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('tenant_deletion_grace_days')->default(30)->after('instagram_url');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['deletion_requested_at', 'deletion_requested_by']);
        });
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn('tenant_deletion_grace_days');
        });
    }
};
