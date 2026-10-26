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
        // Super admin, boutique publique et auth (login/logout/me/reset)
        // résolvent eux-mêmes leur contexte tenant — pas besoin de X-Tenant-ID.
        // Slash final obligatoire pour éviter qu'un préfixe partiel (/api/v1/authorize)
        // hérite accidentellement du bypass.
        $path = $request->getPathInfo();
        if (str_starts_with($path, '/api/v1/admin/') ||
            str_starts_with($path, '/api/v1/public/') ||
            str_starts_with($path, '/api/v1/auth/')) {
            return $next($request);
        }

        $apiKey = $request->header('X-Tenant-ID');

        if (empty($apiKey)) {
            return response()->json([
                'message' => 'En-tête X-Tenant-ID manquant.',
                'code' => 'TENANT_HEADER_MISSING',
            ], 400);
        }

        $tenant = $this->resolveTenant($apiKey);

        if (! $tenant) {
            return response()->json([
                'message' => 'Tenant introuvable.',
                'code' => 'TENANT_NOT_FOUND',
            ], 404);
        }

        // Vérification is_active toujours fraîche depuis la base —
        // jamais depuis le cache, pour bloquer instantanément les suspensions.
        if (! $tenant->is_active) {
            return response()->json([
                'message' => 'Ce compte est suspendu. Contactez le support.',
                'code' => 'TENANT_SUSPENDED',
            ], 401);
        }

        $this->tenantService->setCurrentTenant($tenant);
        $request->attributes->set('tenant', $tenant);

        // Applique le fuseau horaire du tenant au process PHP.
        // Cela rend Carbon::today(), now() et parseDateRange() corrects localement.
        // MySQL garde son propre timezone — les requêtes passent des bornes UTC calculées par Carbon.
        date_default_timezone_set($tenant->timezone ?? 'Africa/Dakar');

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
