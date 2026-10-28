<?php

use App\Http\Controllers\Billing\WebhookController;
use App\Http\Controllers\Landing\PublicOgController;
use App\Http\Controllers\Landing\PublicPlanController;
use App\Http\Controllers\Landing\PublicRegistrationController;
use App\Http\Controllers\Landing\PublicSitemapController;
use App\Http\Controllers\Landing\PublicSiteSettingsController;
use App\Http\Controllers\Landing\PublicTenantController;
use App\Http\Controllers\Shop\PublicShopController;
use Illuminate\Support\Facades\Route;

// ── Landing Page — endpoints publics sans auth ────────────────────────────────
Route::prefix('v1/public')->middleware('throttle:60,1')->group(function () {
    Route::get('plans', [PublicPlanController::class,        'index']);
    Route::get('sitemap-shops.xml', [PublicSitemapController::class, 'shops']);
    Route::get('og/{slug}', [PublicOgController::class, 'shop']);
    Route::get('og/{slug}/catalog', [PublicOgController::class, 'catalog']);
    Route::get('site-settings', [PublicSiteSettingsController::class, 'index']);
    Route::get('tenant/{slug}', [PublicTenantController::class,       'resolve'])
        ->middleware('throttle:30,1');
    Route::post('register', [PublicRegistrationController::class,  'register'])
        ->middleware('throttle:10,1');
});

// ── Résolution tenant par domaine custom (sans auth) ─────────────────────────
Route::get('v1/public/resolve-domain', [PublicShopController::class, 'resolveByDomain'])
    ->middleware('throttle:30,1');

// ── Boutique publique (sans auth, sans X-Tenant-ID) ──────────────────────────
Route::prefix('v1/public/{slug}')
    ->middleware(['throttle:60,1', 'shop.public'])
    ->group(function () {
        Route::get('config', [PublicShopController::class, 'config']);
        Route::get('products', [PublicShopController::class, 'products']);
        Route::get('products/{uid}', [PublicShopController::class, 'product']);
        Route::get('categories', [PublicShopController::class, 'categories']);
        Route::post('orders', [PublicShopController::class, 'order'])
            ->middleware('throttle:10,1');
        Route::post('newsletter/subscribe', [PublicShopController::class, 'subscribe'])
            ->middleware('throttle:5,1');
        Route::get('newsletter/unsubscribe', [PublicShopController::class, 'unsubscribe'])
            ->middleware('throttle:10,1');
    });

// ── Webhooks paiement — pas d'auth, pas de ResolveTenant ────────────────────
// Chaque gateway vérifie la signature dans verifyWebhookSignature().
Route::prefix('v1/billing/webhook')->name('billing.webhook.')->group(function () {
    Route::post('paydunya', [WebhookController::class, 'paydunya'])->name('paydunya');
    Route::post('bictorys', [WebhookController::class, 'bictorys'])->name('bictorys');
});
