<?php

use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\ResolveTenant;
use App\Services\TenantService;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'tenant'     => ResolveTenant::class,
            'permission' => CheckPermission::class,
        ]);

        // ResolveTenant s'exécute en premier sur toutes les routes API
        $middleware->api(prepend: [
            ResolveTenant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();

return $app;
