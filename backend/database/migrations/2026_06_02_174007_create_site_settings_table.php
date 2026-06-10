<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();
            $table->string('contact_email')->nullable();
            $table->string('contact_whatsapp')->nullable();
            $table->string('contact_address')->nullable();
            $table->string('contact_hours')->nullable();
            $table->string('facebook_url')->nullable();
            $table->string('twitter_url')->nullable();
            $table->string('linkedin_url')->nullable();
            $table->string('instagram_url')->nullable();
            $table->timestamps();
        });

        // Ligne singleton — toujours id = 1
        DB::table('site_settings')->insert([
            'contact_email'    => 'contact@didisphere.sn',
            'contact_whatsapp' => '+221 00 000 00 00',
            'contact_address'  => 'Dakar, Sénégal',
            'contact_hours'    => 'Lun–Ven 8h–18h',
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
