<?php

namespace App\Providers;

use App\Contracts\PaymentGatewayInterface;
use App\Gateways\BictorysGateway;
use App\Gateways\NullGateway;
use App\Gateways\PayDunyaGateway;
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

        // PaymentGateway : binding configurable via PAYMENT_PROVIDER dans .env
        // Changer de provider = changer la valeur .env, pas le code.
        $this->app->bind(PaymentGatewayInterface::class, function () {
            return match (config('payment.provider')) {
                'paydunya'    => new PayDunyaGateway(),
                'bictorys'    => new BictorysGateway(),
                default       => new NullGateway(), // null, 'nullgateway', 'null', ou toute autre valeur
            };
        });
    }

    public function boot(): void
    {
        // Crée automatiquement les groupes par défaut à la création d'un tenant
        Tenant::observe(TenantObserver::class);
    }
}
