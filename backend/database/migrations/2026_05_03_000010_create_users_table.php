<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();

            $table->string('name');
            $table->string('email', 191);
            $table->string('password');
            $table->string('avatar_path')->nullable();

            $table->boolean('is_active')->default(true);

            $table->rememberToken();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();

            // Un email unique par tenant (deux tenants peuvent avoir le même email)
            $table->unique(['tenant_id', 'email']);
            $table->index(['tenant_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
