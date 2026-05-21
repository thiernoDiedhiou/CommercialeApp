<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function __construct(private readonly TenantService $tenantService) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Les routes super admin et boutique publique ont leur propre résolution
        if (str_starts_with($request->getPathInfo(), '/api/v1/admin') ||
            str_starts_with($request->getPathInfo(), '/api/v1/public')) {
            return $next($request);
        }

        $apiKey = $request->header('X-Tenant-ID');

        if (empty($apiKey)) {
            return response()->json([
                'message' => 'En-tête X-Tenant-ID manquant.',
                'code'    => 'TENANT_HEADER_MISSING',
            ], 400);
        }

        $tenant = $this->resolveTenant($apiKey);

        if (! $tenant) {
            return response()->json([
                'message' => 'Tenant introuvable.',
                'code'    => 'TENANT_NOT_FOUND',
            ], 404);
        }

        // Vérification is_active toujours fraîche depuis la base —
        // jamais depuis le cache, pour bloquer instantanément les suspensions.
        if (! $tenant->is_active) {
            return response()->json([
                'message' => 'Ce compte est suspendu. Contactez le support.',
                'code'    => 'TENANT_SUSPENDED',
            ], 401);
        }

        $this->tenantService->setCurrentTenant($tenant);
        $request->attributes->set('tenant', $tenant);

        return $next($request);
    }

    private function resolveTenant(string $apiKey): ?Tenant
    {
        // On cache uniquement l'ID — données immuables, jamais périmées.
        // L'api_key ne change pas après création, ce mapping est permanent.
        $cacheKey = "tenant:api_key:{$apiKey}";

        $tenantId = Cache::remember($cacheKey, now()->addHours(24), function () use ($apiKey) {
            return Tenant::where('api_key', $apiKey)->value('id');
        });

        if (! $tenantId) {
            return null;
        }

        // Chargement frais par clé primaire (lookup indexé ultra-rapide).
        // is_active, subscription_ends_at, etc. sont toujours à jour.
        return Tenant::find($tenantId);
    }
}
