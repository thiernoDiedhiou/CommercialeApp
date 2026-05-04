<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\PermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function __construct(private readonly PermissionService $permissionService) {}

    /**
     * Usage dans les routes : ->middleware('permission:products.create')
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Non authentifié.',
                'code'    => 'UNAUTHENTICATED',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Votre compte est désactivé.',
                'code'    => 'ACCOUNT_DISABLED',
            ], 403);
        }

        if (! $this->permissionService->hasPermission($user, $permission)) {
            return response()->json([
                'message'             => "Vous n'avez pas la permission requise pour cette action.",
                'code'                => 'FORBIDDEN',
                'required_permission' => $permission,
            ], 403);
        }

        return $next($request);
    }
}
