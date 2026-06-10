<?php

use App\Http\Controllers\Admin\AdminAuthController;
use App\Http\Controllers\Admin\AdminSiteSettingsController;
use App\Http\Controllers\Admin\AdminTenantController;
use App\Http\Controllers\Landing\PublicPlanController;
use App\Http\Controllers\Landing\PublicRegistrationController;
use App\Http\Controllers\Landing\PublicSiteSettingsController;
use App\Http\Controllers\Landing\PublicTenantController;
use App\Http\Controllers\Admin\AdminStatsController;
use App\Http\Controllers\Admin\AdminPlanController;
use App\Http\Controllers\Admin\AdminSubscriptionController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Brand\BrandController;
use App\Http\Controllers\Category\CategoryController;
use App\Http\Controllers\Customer\CustomerController;
use App\Http\Controllers\Customer\DebtController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Pos\PosDraftController;
use App\Http\Controllers\Pos\PosController;
use App\Http\Controllers\Product\AttributeController;
use App\Http\Controllers\Product\ProductController;
use App\Http\Controllers\Product\ProductLotController;
use App\Http\Controllers\Product\VariantController;
use App\Http\Controllers\Invoice\InvoiceController;
use App\Http\Controllers\Product\ProductImportController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\Purchase\PurchaseOrderController;
use App\Http\Controllers\Purchase\SupplierController;
use App\Http\Controllers\Report\ReportController;
use App\Http\Controllers\Sale\ReturnController;
use App\Http\Controllers\Sale\SaleController;
use App\Http\Controllers\Stock\StockController;
use App\Http\Controllers\Shop\PublicShopController;
use App\Http\Controllers\Shop\ShopAdminController;
use App\Http\Controllers\Users\GroupController;
use App\Http\Controllers\Users\UserController;
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
*/

// ── Landing Page — endpoints publics sans auth ────────────────────────────────
Route::prefix('v1/public')->middleware('throttle:60,1')->group(function () {
    Route::get('plans',             [PublicPlanController::class,        'index']);
    Route::get('site-settings',     [PublicSiteSettingsController::class, 'index']);
    Route::get('tenant/{slug}',     [PublicTenantController::class,       'resolve'])
         ->middleware('throttle:30,1');
    Route::post('register',         [PublicRegistrationController::class,  'register'])
         ->middleware('throttle:10,1');
});

// ── Résolution tenant par domaine custom (sans auth) ─────────────────────────
Route::get('v1/public/resolve-domain', [PublicShopController::class, 'resolveByDomain'])
    ->middleware('throttle:30,1');

// ── Boutique publique (sans auth, sans X-Tenant-ID) ──────────────────────────
Route::prefix('v1/public/{slug}')
    ->middleware(['throttle:60,1', 'shop.public'])
    ->group(function () {
        Route::get('config',               [PublicShopController::class, 'config']);
        Route::get('products',             [PublicShopController::class, 'products']);
        Route::get('products/{productId}', [PublicShopController::class, 'product'])
             ->where('productId', '[0-9]+');
        Route::get('categories',           [PublicShopController::class, 'categories']);
        Route::post('orders',              [PublicShopController::class, 'order'])
             ->middleware('throttle:10,1');
    });

Route::prefix('v1')->group(function () {

    // ── Super Admin ───────────────────────────────────────────────────────────
    Route::prefix('admin')->name('admin.')->group(function () {
        Route::post('auth/login',  [AdminAuthController::class, 'login'])->name('auth.login');

        Route::middleware('super_admin')->group(function () {
            Route::post('auth/logout', [AdminAuthController::class, 'logout'])->name('auth.logout');
            Route::get('auth/me',      [AdminAuthController::class, 'me'])->name('auth.me');

            Route::get('stats', [AdminStatsController::class, 'index'])->name('stats');

            // ── Plans ──────────────────────────────────────────────────────
            Route::prefix('plans')->name('plans.')->group(function () {
                Route::get('/',          [AdminPlanController::class, 'index'])->name('index');
                Route::post('/',         [AdminPlanController::class, 'store'])->name('store');
                Route::get('{plan}',     [AdminPlanController::class, 'show'])->name('show');
                Route::put('{plan}',     [AdminPlanController::class, 'update'])->name('update');
                Route::delete('{plan}',  [AdminPlanController::class, 'destroy'])->name('destroy');
            });

            // ── Abonnements (vue globale) ───────────────────────────────────
            Route::get('subscriptions', [AdminSubscriptionController::class, 'index'])->name('subscriptions.index');

            // ── Paramètres du site (singleton) ─────────────────────────────
            Route::get('site-settings', [AdminSiteSettingsController::class, 'show'])->name('site-settings.show');
            Route::put('site-settings', [AdminSiteSettingsController::class, 'update'])->name('site-settings.update');

            // ── Tenants ────────────────────────────────────────────────────
            Route::prefix('tenants')->name('tenants.')->group(function () {
                Route::get('/',                      [AdminTenantController::class, 'index'])->name('index');
                Route::post('/',                     [AdminTenantController::class, 'store'])->name('store');
                Route::get('{tenant}',               [AdminTenantController::class, 'show'])->name('show');
                Route::put('{tenant}',               [AdminTenantController::class, 'update'])->name('update');
                Route::delete('{tenant}',            [AdminTenantController::class, 'destroy'])->name('destroy');
                Route::post('{tenant}/suspend',      [AdminTenantController::class, 'suspend'])->name('suspend');
                Route::post('{tenant}/activate',     [AdminTenantController::class, 'activate'])->name('activate');
                // Abonnement du tenant
                Route::get('{tenant}/subscription',    [AdminSubscriptionController::class, 'show'])->name('subscription.show');
                Route::post('{tenant}/subscription',   [AdminSubscriptionController::class, 'store'])->name('subscription.store');
                Route::put('{tenant}/subscription',    [AdminSubscriptionController::class, 'update'])->name('subscription.update');
                // Historique complet des abonnements du tenant
                Route::get('{tenant}/subscriptions',   [AdminSubscriptionController::class, 'history'])->name('subscriptions.history');
                // Stats tenant (produits, ventes, clients)
                Route::get('{tenant}/stats',           [AdminTenantController::class, 'stats'])->name('stats');
            });
        });
    });

    // ── Authentification ──────────────────────────────────────────────────────
    Route::prefix('auth')->name('auth.')->group(function () {
        Route::post('login',            [AuthController::class,       'login'])->name('login');
        Route::post('forgot-password',  [PasswordResetController::class, 'send'])->middleware('throttle:5,1')->name('password.send');
        Route::post('reset-password',   [PasswordResetController::class, 'reset'])->middleware('throttle:5,1')->name('password.reset');

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('logout', [AuthController::class, 'logout'])->name('logout');
            Route::get('me',     [AuthController::class, 'me'])->name('me');
        });
    });

    // ── Routes protégées (Sanctum + abonnement valide requis) ────────────────
    Route::middleware(['auth:sanctum', 'subscription'])->group(function () {

        // ── Dashboard ─────────────────────────────────────────────────────────
        Route::get('dashboard/summary', [DashboardController::class, 'summary'])
            ->middleware('permission:dashboard.view');

        // ── Paramètres tenant ─────────────────────────────────────────────────
        Route::prefix('settings')->name('settings.')->group(function () {
            Route::get('/',  [SettingsController::class, 'show'])
                ->middleware('permission:settings.view');
            Route::put('/',  [SettingsController::class, 'update'])
                ->middleware('permission:settings.edit');
            Route::post('/', [SettingsController::class, 'update'])
                ->middleware('permission:settings.edit');
        });

        // ── Rapports ──────────────────────────────────────────────────────────
        // Feature : reports — non incluse dans Starter
        Route::prefix('reports')->name('reports.')
            ->middleware(['permission:reports.view', 'subscription:reports'])
            ->group(function () {
                Route::get('sales',    [ReportController::class, 'sales']);
                Route::get('products', [ReportController::class, 'products']);
                Route::get('stock',    [ReportController::class, 'stock']);
            });

        // ── Marques ───────────────────────────────────────────────────────────
        Route::prefix('brands')->name('brands.')->group(function () {
            Route::get('/',          [BrandController::class, 'index'])  ->middleware('permission:products.view');
            Route::post('/',         [BrandController::class, 'store'])  ->middleware('permission:products.create');
            Route::put('{brand}',    [BrandController::class, 'update']) ->middleware('permission:products.edit');
            Route::delete('{brand}', [BrandController::class, 'destroy'])->middleware('permission:products.delete');
        });

        // ── Catégories ────────────────────────────────────────────────────────
        Route::prefix('categories')->name('categories.')->group(function () {
            Route::get('/',             [CategoryController::class, 'index'])
                ->middleware('permission:categories.view');
            Route::post('/',            [CategoryController::class, 'store'])
                ->middleware('permission:categories.create');
            Route::put('{category}',    [CategoryController::class, 'update'])
                ->middleware('permission:categories.edit');
            Route::delete('{category}', [CategoryController::class, 'destroy'])
                ->middleware('permission:categories.delete');
        });

        // ── Produits ──────────────────────────────────────────────────────────
        Route::prefix('products')->name('products.')->group(function () {
            // Import CSV — feature : import_csv (non incluse dans Starter)
            Route::get('import/template',   [ProductImportController::class, 'template'])
                ->middleware(['permission:products.import', 'subscription:import_csv']);
            Route::post('import',           [ProductImportController::class, 'import'])
                ->middleware(['permission:products.import', 'subscription:import_csv']);

            Route::get('/',    [ProductController::class, 'index'])
                ->middleware('permission:products.view');
            Route::post('/',   [ProductController::class, 'store'])
                ->middleware('permission:products.create');
            Route::get('{product}',          [ProductController::class, 'show'])
                ->middleware('permission:products.view');
            Route::put('{product}',          [ProductController::class, 'update'])
                ->middleware('permission:products.edit');
            Route::delete('{product}',       [ProductController::class, 'destroy'])
                ->middleware('permission:products.delete');
            Route::get('{product}/stock-movements', [ProductController::class, 'stockMovements'])
                ->middleware('permission:stock.view');

            // Variantes
            Route::get('{product}/variants',                  [VariantController::class, 'index'])
                ->middleware('permission:variants.view');
            Route::post('{product}/variants',                 [VariantController::class, 'store'])
                ->middleware('permission:variants.create');
            Route::put('{product}/variants/{variant}',        [VariantController::class, 'update'])
                ->middleware('permission:variants.edit');
            Route::delete('{product}/variants/{variant}',     [VariantController::class, 'destroy'])
                ->middleware('permission:variants.delete');

            // Lots (produits avec suivi d'expiration)
            Route::get('{product}/lots',                   [ProductLotController::class, 'index'])
                ->middleware('permission:stock.view');
            Route::post('{product}/lots',                  [ProductLotController::class, 'store'])
                ->middleware('permission:stock.adjust');
            Route::post('{product}/lots/regularize',       [ProductLotController::class, 'regularize'])
                ->middleware('permission:stock.adjust');
            Route::put('{product}/lots/{lot}',             [ProductLotController::class, 'update'])
                ->middleware('permission:stock.adjust');
        });

        // ── Attributs ─────────────────────────────────────────────────────────
        Route::prefix('attributes')->name('attributes.')->group(function () {
            Route::get('/',    [AttributeController::class, 'index'])
                ->middleware('permission:variants.view');
            Route::post('/',   [AttributeController::class, 'store'])
                ->middleware('permission:variants.create');
            Route::delete('{attribute}', [AttributeController::class, 'destroy'])
                ->middleware('permission:variants.delete');
            Route::post('{attribute}/values',           [AttributeController::class, 'storeValue'])
                ->middleware('permission:variants.create');
            Route::delete('{attribute}/values/{value}', [AttributeController::class, 'destroyValue'])
                ->middleware('permission:variants.delete');
        });

        // ── Stock ─────────────────────────────────────────────────────────────
        Route::prefix('stock')->name('stock.')->group(function () {
            Route::post('adjust',    [StockController::class, 'adjust'])
                ->middleware('permission:stock.adjust');
            Route::get('movements',  [StockController::class, 'movements'])
                ->middleware('permission:stock.view');
            Route::get('alerts',     [StockController::class, 'alerts'])
                ->middleware('permission:stock.view');
            Route::get('expiring',   [StockController::class, 'expiring'])
                ->middleware('permission:stock.view');
        });

        // ── Clients ───────────────────────────────────────────────────────────
        Route::prefix('customers')->name('customers.')->group(function () {
            Route::get('/',                [CustomerController::class, 'index'])
                ->middleware('permission:customers.view');
            Route::post('/',               [CustomerController::class, 'store'])
                ->middleware('permission:customers.create');
            Route::get('{customer}',       [CustomerController::class, 'show'])
                ->middleware('permission:customers.view');
            Route::put('{customer}',       [CustomerController::class, 'update'])
                ->middleware('permission:customers.edit');
            Route::delete('{customer}',    [CustomerController::class, 'destroy'])
                ->middleware('permission:customers.delete');
            Route::get('{customer}/sales', [CustomerController::class, 'sales'])
                ->middleware('permission:sales.view');
        });

        // ── Créances clients ──────────────────────────────────────────────────
        Route::get('debts', [DebtController::class, 'index'])
            ->middleware('permission:debts.view');

        // ── Ventes ────────────────────────────────────────────────────────────
        Route::prefix('sales')->name('sales.')->group(function () {
            Route::get('/',               [SaleController::class, 'index'])
                ->middleware('permission:sales.view');
            Route::post('/',              [SaleController::class, 'store'])
                ->middleware('permission:sales.create');
            Route::get('{sale}',          [SaleController::class, 'show'])
                ->middleware('permission:sales.view');
            Route::post('{sale}/payments',[SaleController::class, 'addPayment'])
                ->middleware('permission:sales.create');
            Route::post('{sale}/cancel',  [SaleController::class, 'cancel'])
                ->middleware('permission:sales.edit');
            Route::get('{sale}/pdf',      [SaleController::class, 'pdf'])
                ->middleware('permission:sales.pdf');
            Route::post('{sale}/returns', [ReturnController::class, 'store'])
                ->middleware('permission:returns.create');
        });

        // ── Retours ───────────────────────────────────────────────────────────
        Route::prefix('returns')->name('returns.')->group(function () {
            Route::get('/',           [ReturnController::class, 'index'])
                ->middleware('permission:returns.view');
            Route::get('{return}',    [ReturnController::class, 'show'])
                ->middleware('permission:returns.view');
        });

        // ── Utilisateurs — feature : multi_user ──────────────────────────────
        Route::prefix('users')->name('users.')->middleware('subscription:multi_user')->group(function () {
            Route::get('/',                [UserController::class, 'index'])
                ->middleware('permission:users.view');
            Route::post('/',               [UserController::class, 'store'])
                ->middleware('permission:users.create');
            Route::put('{user}',           [UserController::class, 'update'])
                ->middleware('permission:users.edit');
            Route::delete('{user}',        [UserController::class, 'destroy'])
                ->middleware('permission:users.delete');
            Route::post('{user}/groups',   [UserController::class, 'syncGroups'])
                ->middleware('permission:users.edit');
        });

        // ── Groupes — feature : multi_user ───────────────────────────────────
        Route::prefix('groups')->name('groups.')->middleware('subscription:multi_user')->group(function () {
            Route::get('/',                     [GroupController::class, 'index'])
                ->middleware('permission:groups.view');
            Route::get('permissions/available', [GroupController::class, 'availablePermissions'])
                ->middleware('permission:groups.view');
            Route::post('/',                    [GroupController::class, 'store'])
                ->middleware('permission:groups.create');
            Route::put('{group}',               [GroupController::class, 'update'])
                ->middleware('permission:groups.edit');
            Route::delete('{group}',            [GroupController::class, 'destroy'])
                ->middleware('permission:groups.delete');
            Route::post('{group}/permissions',  [GroupController::class, 'syncPermissions'])
                ->middleware('permission:groups.edit');
        });

        // ── Facturation — feature : invoicing ────────────────────────────────
        Route::prefix('invoices')->name('invoices.')->middleware('subscription:invoicing')->group(function () {
            Route::get('/',                        [InvoiceController::class, 'index'])
                ->middleware('permission:invoices.view');
            Route::post('/',                       [InvoiceController::class, 'store'])
                ->middleware('permission:invoices.create');
            Route::get('{invoice}',                [InvoiceController::class, 'show'])
                ->middleware('permission:invoices.view');
            Route::put('{invoice}',                [InvoiceController::class, 'update'])
                ->middleware('permission:invoices.edit');
            Route::delete('{invoice}',             [InvoiceController::class, 'destroy'])
                ->middleware('permission:invoices.delete');
            Route::post('{invoice}/send',          [InvoiceController::class, 'send'])
                ->middleware('permission:invoices.edit');
            Route::post('{invoice}/payment',       [InvoiceController::class, 'recordPayment'])
                ->middleware('permission:invoices.edit');
            Route::post('{invoice}/cancel',        [InvoiceController::class, 'cancel'])
                ->middleware('permission:invoices.edit');
            Route::get('{invoice}/pdf',            [InvoiceController::class, 'pdf'])
                ->middleware('permission:invoices.pdf');
        });

        // ── Fournisseurs — feature : purchases ───────────────────────────────
        Route::prefix('suppliers')->name('suppliers.')->middleware('subscription:purchases')->group(function () {
            Route::get('/',               [SupplierController::class, 'index'])
                ->middleware('permission:suppliers.view');
            Route::post('/',              [SupplierController::class, 'store'])
                ->middleware('permission:suppliers.create');
            Route::get('{supplier}',      [SupplierController::class, 'show'])
                ->middleware('permission:suppliers.view');
            Route::put('{supplier}',      [SupplierController::class, 'update'])
                ->middleware('permission:suppliers.edit');
            Route::delete('{supplier}',   [SupplierController::class, 'destroy'])
                ->middleware('permission:suppliers.delete');
        });

        // ── Bons de commande — feature : purchases ───────────────────────────
        Route::prefix('purchases')->name('purchases.')->middleware('subscription:purchases')->group(function () {
            Route::get('/',                          [PurchaseOrderController::class, 'index'])
                ->middleware('permission:purchases.view');
            Route::post('/',                         [PurchaseOrderController::class, 'store'])
                ->middleware('permission:purchases.create');
            Route::get('{purchaseOrder}',            [PurchaseOrderController::class, 'show'])
                ->middleware('permission:purchases.view');
            Route::put('{purchaseOrder}',            [PurchaseOrderController::class, 'update'])
                ->middleware('permission:purchases.edit');
            Route::delete('{purchaseOrder}',         [PurchaseOrderController::class, 'destroy'])
                ->middleware('permission:purchases.delete');
            Route::post('{purchaseOrder}/confirm',   [PurchaseOrderController::class, 'confirm'])
                ->middleware('permission:purchases.edit');
            Route::post('{purchaseOrder}/receive',   [PurchaseOrderController::class, 'receive'])
                ->middleware('permission:purchases.receive');
            Route::post('{purchaseOrder}/cancel',    [PurchaseOrderController::class, 'cancel'])
                ->middleware('permission:purchases.edit');
        });

        // ── POS ───────────────────────────────────────────────────────────────
        Route::prefix('pos')->name('pos.')->middleware('permission:pos.access')->group(function () {
            Route::get('products',                 [PosController::class, 'products'])->name('products');
            Route::get('session/current',          [PosController::class, 'currentSession'])->name('session.current');
            Route::post('session/open',            [PosController::class, 'openSession'])->name('session.open');
            Route::post('session/{session}/close', [PosController::class, 'closeSession'])->name('session.close');
            Route::post('sync',                    [PosController::class, 'syncOffline'])->name('sync');
            Route::apiResource('drafts',           PosDraftController::class)->names('drafts');
        });

        // ── Boutique en ligne (admin) — feature : shop ───────────────────────
        Route::prefix('shop')->name('shop.')->middleware('subscription:shop')->group(function () {
            Route::get('settings',                 [ShopAdminController::class, 'settings'])
                ->middleware('permission:shop.manage');
            Route::post('settings/update',         [ShopAdminController::class, 'updateSettings'])
                ->middleware('permission:shop.manage');
            Route::post('settings/toggle-active',  [ShopAdminController::class, 'toggleActive'])
                ->middleware('permission:shop.manage');
            Route::get('orders',                   [ShopAdminController::class, 'orders'])
                ->middleware('permission:shop.orders');
            Route::get('orders/{order}',           [ShopAdminController::class, 'showOrder'])
                ->middleware('permission:shop.orders');
            Route::put('orders/{order}/status',    [ShopAdminController::class, 'updateStatus'])
                ->middleware('permission:shop.orders');
        });

    });

});
