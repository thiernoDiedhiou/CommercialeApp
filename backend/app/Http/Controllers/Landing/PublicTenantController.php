<?php

namespace App\Http\Controllers\Landing;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;

class PublicTenantController extends Controller
{
    /**
     * Résout un slug public en clé d'accès.
     * Permet au frontend d'utiliser ?tenant=slug dans l'URL (non sensible)
     * plutôt que ?key=api_key (sensible).
     */
    public function resolve(string $slug): JsonResponse
    {
        $tenant = Tenant::where('slug', $slug)
            ->where('is_active', true)
            ->first(['id', 'slug', 'api_key']);

        if (! $tenant) {
            return response()->json(['message' => 'Boutique introuvable.'], 404);
        }

        return response()->json([
            'slug'    => $tenant->slug,
            'api_key' => $tenant->getRawOriginal('api_key'),
        ]);
    }
}
