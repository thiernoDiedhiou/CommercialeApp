<?php

namespace App\Providers;

use App\Models\Tenant;
use App\Observers\TenantObserver;
use App\Services\PermissionService;
use App\Services\TenantService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // TenantService : singleton de requête — partage l'état du tenant courant
        $this->app->singleton(TenantService::class);

        // PermissionService : sans état propre, mais singleton pour éviter les
        // instanciations répétées dans les middlewares et controllers
        $this->app->singleton(PermissionService::class);
    }

    public function boot(): void
    {
        // Crée automatiquement les groupes par défaut à la création d'un tenant
        Tenant::observe(TenantObserver::class);
    }
}
