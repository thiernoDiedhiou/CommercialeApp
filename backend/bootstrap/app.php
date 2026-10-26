<?php

use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\CheckSubscription;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\ResolveBranch;
use App\Http\Middleware\ResolvePublicShop;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\SetSecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'tenant' => ResolveTenant::class,
            'branch' => ResolveBranch::class,
            'permission' => CheckPermission::class,
            'super_admin' => EnsureSuperAdmin::class,
            'shop.public' => ResolvePublicShop::class,
            'subscription' => CheckSubscription::class,
        ]);

        // ResolveTenant s'exécute en premier, ResolveBranch après (besoin du tenant résolu).
        $middleware->api(prepend: [
            ResolveTenant::class,
            ResolveBranch::class,
            SetSecurityHeaders::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();

return $app;
