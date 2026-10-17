<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — SaaS Gestion Commerciale
|--------------------------------------------------------------------------
| Toutes les routes reçoivent automatiquement le middleware ResolveTenant
| (appliqué en prepend dans bootstrap/app.php).
|
| Préfixe global : /api/v1/
| Auth : Laravel Sanctum (token Bearer)
| Permissions : middleware permission:{name} → CheckPermission
|
| Structure :
|   routes/api/public.php  — landing page, boutique publique, webhooks
|   routes/api/admin.php   — Super Admin (pas de tenant, pas de Sanctum tenant)
|   routes/api/tenant.php  — routes authentifiées par tenant (Sanctum)
*/

Route::prefix('v1')->group(function () {
    require base_path('routes/api/admin.php');
    require base_path('routes/api/tenant.php');
});

require base_path('routes/api/public.php');
