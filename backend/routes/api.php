<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Category\CategoryController;
use App\Http\Controllers\Customer\CustomerController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Pos\PosDraftController;
use App\Http\Controllers\Pos\PosController;
use App\Http\Controllers\Product\AttributeController;
use App\Http\Controllers\Product\ProductController;
use App\Http\Controllers\Product\VariantController;
use App\Http\Controllers\Invoice\InvoiceController;
use App\Http\Controllers\Product\ProductImportController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\Purchase\PurchaseOrderController;
use App\Http\Controllers\Purchase\SupplierController;
use App\Http\Controllers\Report\ReportController;
use App\Http\Controllers\Sale\SaleController;
use App\Http\Controllers\Stock\StockController;
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

Route::prefix('v1')->group(function () {

    // ── Authentification ──────────────────────────────────────────────────────
    Route::prefix('auth')->name('auth.')->group(function () {
        Route::post('login', [AuthController::class, 'login'])->name('login');

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('logout', [AuthController::class, 'logout'])->name('logout');
            Route::get('me',     [AuthController::class, 'me'])->name('me');
        });
    });

    // ── Routes protégées (Sanctum requis) ─────────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

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
        Route::prefix('reports')->name('reports.')->middleware('permission:reports.view')->group(function () {
            Route::get('sales',    [ReportController::class, 'sales']);
            Route::get('products', [ReportController::class, 'products']);
            Route::get('stock',    [ReportController::class, 'stock']);
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
            // Import CSV — déclaré avant {product} pour éviter toute collision de route
            Route::get('import/template',   [ProductImportController::class, 'template'])
                ->middleware('permission:products.import');
            Route::post('import',           [ProductImportController::class, 'import'])
                ->middleware('permission:products.import');

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
        });

        // ── Utilisateurs ──────────────────────────────────────────────────────
        Route::prefix('users')->name('users.')->group(function () {
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

        // ── Groupes ───────────────────────────────────────────────────────────
        Route::prefix('groups')->name('groups.')->group(function () {
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

        // ── Facturation ───────────────────────────────────────────────────────
        Route::prefix('invoices')->name('invoices.')->group(function () {
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

        // ── Fournisseurs ──────────────────────────────────────────────────────
        Route::prefix('suppliers')->name('suppliers.')->group(function () {
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

        // ── Bons de commande (Achats) ─────────────────────────────────────────
        Route::prefix('purchases')->name('purchases.')->group(function () {
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

    });

});
