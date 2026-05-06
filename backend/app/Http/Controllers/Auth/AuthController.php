<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Services\PermissionService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        private readonly TenantService $tenantService,
        private readonly PermissionService $permissionService,
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        // TenantScope sur User est déjà actif (tenant résolu par ResolveTenant middleware)
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Email ou mot de passe incorrect.',
                'code'    => 'INVALID_CREDENTIALS',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Votre compte est désactivé. Contactez votre administrateur.',
                'code'    => 'ACCOUNT_DISABLED',
            ], 403);
        }

        // Révoque les anciens tokens de cet appareil si device_name fourni
        if ($request->has('device_name')) {
            $user->tokens()->where('name', $request->device_name)->delete();
        }

        $token = $user->createToken($request->input('device_name', 'api'))->plainTextToken;

        return response()->json([
            'token' => $token,
            'data'  => $this->buildMePayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->buildMePayload($request->user()),
        ]);
    }

    private function buildMePayload(User $user): array
    {
        $tenant = $this->tenantService->current();

        return [
            'user' => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'avatar'     => $user->avatar_path,
                'is_active'  => $user->is_active,
            ],
            'permissions' => $this->permissionService->getPermissions($user),
            'tenant' => [
                'name'            => $tenant->name,
                'currency'        => $tenant->currency,
                'sector'          => $tenant->sector,
                'primary_color'   => $tenant->primary_color,
                'secondary_color' => $tenant->secondary_color,
            ],
        ];
    }
}
