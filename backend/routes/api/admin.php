<?php

use App\Http\Controllers\Admin\AdminAuthController;
use App\Http\Controllers\Admin\AdminNotificationController;
use App\Http\Controllers\Admin\AdminPlanController;
use App\Http\Controllers\Admin\AdminSiteSettingsController;
use App\Http\Controllers\Admin\AdminStatsController;
use App\Http\Controllers\Admin\AdminSubscriptionController;
use App\Http\Controllers\Admin\AdminTenantController;
use Illuminate\Support\Facades\Route;

// ── Super Admin ───────────────────────────────────────────────────────────────
Route::prefix('admin')->name('admin.')->group(function () {
    Route::post('auth/login', [AdminAuthController::class, 'login'])->middleware('throttle:5,1')->name('auth.login');

    Route::middleware('super_admin')->group(function () {
        Route::post('auth/logout', [AdminAuthController::class, 'logout'])->name('auth.logout');
        Route::get('auth/me', [AdminAuthController::class, 'me'])->name('auth.me');
        Route::put('auth/profile', [AdminAuthController::class, 'updateProfile'])->name('auth.profile.update');
        Route::post('auth/avatar', [AdminAuthController::class, 'uploadAvatar'])->name('auth.avatar.upload');
        Route::delete('auth/avatar', [AdminAuthController::class, 'deleteAvatar'])->name('auth.avatar.delete');

        Route::get('stats', [AdminStatsController::class, 'index'])->name('stats');

        // ── Plans ──────────────────────────────────────────────────────────────
        Route::prefix('plans')->name('plans.')->group(function () {
            Route::get('/', [AdminPlanController::class, 'index'])->name('index');
            Route::post('/', [AdminPlanController::class, 'store'])->name('store');
            Route::get('{plan:uid}', [AdminPlanController::class, 'show'])->name('show');
            Route::put('{plan:uid}', [AdminPlanController::class, 'update'])->name('update');
            Route::delete('{plan:uid}', [AdminPlanController::class, 'destroy'])->name('destroy');
        });

        // ── Abonnements (vue globale) ───────────────────────────────────────────
        Route::get('subscriptions', [AdminSubscriptionController::class, 'index'])->name('subscriptions.index');

        // ── Paramètres du site (singleton) ─────────────────────────────────────
        Route::get('site-settings', [AdminSiteSettingsController::class, 'show'])->name('site-settings.show');
        Route::put('site-settings', [AdminSiteSettingsController::class, 'update'])->name('site-settings.update');

        // ── Notifications Super Admin ───────────────────────────────────────────
        Route::prefix('notifications')->name('notifications.')->group(function () {
            Route::get('/', [AdminNotificationController::class, 'index'])->name('index');
            Route::post('read-all', [AdminNotificationController::class, 'markAllRead'])->name('read-all');
            Route::post('{id}/read', [AdminNotificationController::class, 'markRead'])->name('read');
            Route::delete('{id}', [AdminNotificationController::class, 'destroy'])->name('destroy');
        });

        // ── Tenants ─────────────────────────────────────────────────────────────
        Route::prefix('tenants')->name('tenants.')->group(function () {
            Route::get('/', [AdminTenantController::class, 'index'])->name('index');
            Route::post('/', [AdminTenantController::class, 'store'])->name('store');
            Route::get('{tenant:uid}', [AdminTenantController::class, 'show'])->name('show');
            Route::put('{tenant:uid}', [AdminTenantController::class, 'update'])->name('update');
            Route::delete('{tenant:uid}', [AdminTenantController::class, 'destroy'])->name('destroy');
            Route::post('{tenant:uid}/suspend', [AdminTenantController::class, 'suspend'])->name('suspend');
            Route::post('{tenant:uid}/activate', [AdminTenantController::class, 'activate'])->name('activate');
            Route::post('{tenant:uid}/rotate-api-key', [AdminTenantController::class, 'rotateApiKey'])->name('rotate-api-key');
            // Corbeille RGPD — ces routes acceptent les modèles soft-deleted
            Route::post('{tenant:uid}/restore', [AdminTenantController::class, 'restore'])->name('restore')->withTrashed();
            Route::post('{tenant:uid}/schedule-deletion', [AdminTenantController::class, 'scheduleDeletion'])->name('schedule-deletion')->withTrashed();
            Route::post('{tenant:uid}/cancel-deletion', [AdminTenantController::class, 'cancelDeletion'])->name('cancel-deletion')->withTrashed();
            // Abonnement du tenant
            Route::get('{tenant:uid}/subscription', [AdminSubscriptionController::class, 'show'])->name('subscription.show');
            Route::post('{tenant:uid}/subscription', [AdminSubscriptionController::class, 'store'])->name('subscription.store');
            Route::put('{tenant:uid}/subscription', [AdminSubscriptionController::class, 'update'])->name('subscription.update');
            // Historique complet des abonnements du tenant
            Route::get('{tenant:uid}/subscriptions', [AdminSubscriptionController::class, 'history'])->name('subscriptions.history');
            // Stats tenant (produits, ventes, clients)
            Route::get('{tenant:uid}/stats', [AdminTenantController::class, 'stats'])->name('stats');
        });
    });
});
