<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private array $tables = [
        'tenants',
        'users',
        'products',
        'product_variants',
        'categories',
        'brands',
        'customers',
        'suppliers',
        'groups',
        'sales',
        'sale_returns',
        'purchase_orders',
        'invoices',
        'shop_orders',
        'plans',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->uuid('uid')->nullable()->unique()->after('id');
            });
        }

        // Remplir les uid existants (chunk pour limiter l'empreinte mémoire)
        foreach ($this->tables as $table) {
            DB::table($table)->orderBy('id')->chunk(500, function ($rows) use ($table): void {
                foreach ($rows as $row) {
                    DB::table($table)->where('id', $row->id)->update(['uid' => (string) Str::uuid()]);
                }
            });
        }

        // Rendre NOT NULL une fois remplis
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->uuid('uid')->nullable(false)->change();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('uid');
            });
        }
    }
};
