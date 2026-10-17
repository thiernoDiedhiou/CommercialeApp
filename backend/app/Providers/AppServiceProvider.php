<?php

namespace App\Providers;

use App\Contracts\PaymentGatewayInterface;
use App\Events\InvoiceCancelled;
use App\Events\InvoiceCreated;
use App\Events\InvoicePaid;
use App\Events\InvoiceSent;
use App\Events\SaleCancelled;
use App\Events\SaleCreated;
use App\Gateways\BictorysGateway;
use App\Gateways\NullGateway;
use App\Gateways\PayDunyaGateway;
use App\Listeners\LogInvoiceCancelled;
use App\Listeners\LogInvoiceCreated;
use App\Listeners\LogInvoicePaid;
use App\Listeners\LogInvoiceSent;
use App\Listeners\LogSaleCancelled;
use App\Listeners\LogSaleCreated;
use App\Models\Tenant;
use App\Observers\TenantObserver;
use App\Services\PermissionService;
use App\Services\TenantService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
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

        // Domain Events — découple les services de ActivityLogService.
        // Ajouter un listener ici sans toucher au service émetteur.
        Event::listen(SaleCreated::class,    LogSaleCreated::class);
        Event::listen(SaleCancelled::class,  LogSaleCancelled::class);
        Event::listen(InvoiceCreated::class, LogInvoiceCreated::class);
        Event::listen(InvoicePaid::class,     LogInvoicePaid::class);
        Event::listen(InvoiceSent::class,     LogInvoiceSent::class);
        Event::listen(InvoiceCancelled::class, LogInvoiceCancelled::class);

        // Limite à 10 jobs de notification par tenant par minute.
        // Calibré sur le pic réaliste PME : ~20 alertes stock lors d'une réception d'achat,
        // traitées en 2 passes d'1 min → acceptable. Les jobs excédentaires sont relâchés
        // et retentés automatiquement sans perte.
        RateLimiter::for('tenant-notifications', function (object $job) {
            $tenantId = match (true) {
                property_exists($job, 'tenant')      => $job->tenant?->id ?? 0,
                property_exists($job, 'invoice')     => $job->invoice?->tenant_id ?? 0,
                property_exists($job, 'transaction') => $job->transaction?->tenant_id ?? 0,
                default                              => 0,
            };

            return Limit::perMinute(10)->by($tenantId);
        });
    }
}
