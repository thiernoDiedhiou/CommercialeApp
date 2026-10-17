<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_lots', function (Blueprint $table) {
            $table->uuid('uid')->nullable()->unique()->after('id');
        });

        // Backfill UUID pour les lots existants
        DB::table('product_lots')->whereNull('uid')->chunkById(500, function ($rows) {
            foreach ($rows as $row) {
                DB::table('product_lots')->where('id', $row->id)->update(['uid' => (string) Str::uuid()]);
            }
        });

        Schema::table('product_lots', function (Blueprint $table) {
            $table->uuid('uid')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('product_lots', function (Blueprint $table) {
            $table->dropColumn('uid');
        });
    }
};
