<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('newsletter_campaigns', function (Blueprint $table) {
            $table->longText('design')->nullable()->after('body');
        });
    }

    public function down(): void
    {
        Schema::table('newsletter_campaigns', function (Blueprint $table) {
            $table->dropColumn('design');
        });
    }
};
