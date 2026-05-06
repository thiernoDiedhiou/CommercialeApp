<?php

namespace App\Http\Middleware;

use App\Models\SuperAdmin;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainToken = $request->bearerToken();

        if (! $plainToken) {
            return response()->json(['message' => 'Non authentifié.', 'code' => 'UNAUTHENTICATED'], 401);
        }

        // findToken() gère le format "{id}|{token}" de Sanctum et hash correctement
        $accessToken = PersonalAccessToken::findToken($plainToken);

        if (! $accessToken || $accessToken->tokenable_type !== SuperAdmin::class) {
            return response()->json(['message' => 'Token invalide.', 'code' => 'INVALID_TOKEN'], 401);
        }

        /** @var SuperAdmin $superAdmin */
        $superAdmin = $accessToken->tokenable;

        if (! $superAdmin || ! $superAdmin->is_active) {
            return response()->json(['message' => 'Compte super admin désactivé.', 'code' => 'ACCOUNT_DISABLED'], 403);
        }

        $accessToken->forceFill(['last_used_at' => now()])->save();
        $request->attributes->set('super_admin', $superAdmin);

        return $next($request);
    }
}
