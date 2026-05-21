<?php

namespace App\Http\Middleware;

use App\Models\ShopSetting;
use App\Models\Tenant;
use App\Services\TenantService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolvePublicShop
{
    public function __construct(private readonly TenantService $tenantService) {}

    public function handle(Request $request, Closure $next): Response
    {
        $slug = $request->route('slug');

        $tenant = Tenant::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $tenant) {
            abort(404, 'Boutique introuvable.');
        }

        // Contexte tenant actif pour que les scopes Eloquent fonctionnent
        $this->tenantService->setCurrentTenant($tenant);

        $shop = ShopSetting::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->first();

        if (! $shop || ! $shop->is_active) {
            abort(404, 'Boutique non disponible.');
        }

        $request->attributes->set('shop', $shop);

        return $next($request);
    }
}
