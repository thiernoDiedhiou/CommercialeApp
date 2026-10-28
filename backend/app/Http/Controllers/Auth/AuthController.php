<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Branch;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Services\PermissionService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    public function __construct(
        private readonly TenantService $tenantService,
        private readonly PermissionService $permissionService,
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        // Lookup global — ResolveTenant bypassé pour /api/v1/auth, tenant résolu ici
        $user = User::withoutGlobalScopes()
            ->where('email', $request->email)
            ->where('is_active', true)
            ->with('tenant')
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Email ou mot de passe incorrect.',
                'code' => 'INVALID_CREDENTIALS',
            ], 401);
        }

        if (! $user->tenant?->is_active) {
            return response()->json([
                'message' => 'Votre espace est suspendu. Contactez le support.',
                'code' => 'TENANT_SUSPENDED',
            ], 403);
        }

        // Établit le contexte tenant pour buildMePayload
        $this->tenantService->setCurrentTenant($user->tenant);

        // Révoque les anciens tokens de cet appareil si device_name fourni
        if ($request->has('device_name')) {
            $user->tokens()->where('name', $request->device_name)->delete();
        }

        $token = $user->createToken($request->input('device_name', 'api'))->plainTextToken;

        ActivityLogService::log('login', 'auth', 'Connexion de '.$user->name);

        return response()->json([
            'token' => $token,
            'data' => $this->buildMePayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        ActivityLogService::log('logout', 'auth', 'Déconnexion');

        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'locale' => ['nullable', 'string', 'in:fr,en'],
            'current_password' => ['nullable', 'string'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        $passwordChange = ! empty($validated['password']);

        if ($passwordChange) {
            if (empty($validated['current_password']) || ! Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Le mot de passe actuel est incorrect.',
                    'errors' => ['current_password' => ['Le mot de passe actuel est incorrect.']],
                ], 422);
            }
        }

        $user->name = $validated['name'];
        if (array_key_exists('locale', $validated) && $validated['locale'] !== null) {
            $user->locale = $validated['locale'];
        }
        if ($passwordChange) {
            $user->password = Hash::make($validated['password']);
        }
        $user->save();

        // Révoque toutes les sessions actives sauf la courante après changement de mot de passe
        if ($passwordChange) {
            $user->tokens()
                ->where('id', '!=', $request->user()->currentAccessToken()->id)
                ->delete();
        }

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'locale' => $user->locale,
            ],
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'file', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ]);

        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $path = $request->file('avatar')->store("avatars/{$user->tenant_id}", 'public');
        $user->update(['avatar_path' => $path]);

        return response()->json([
            'avatar' => Storage::disk('public')->url($path),
        ]);
    }

    public function deleteAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);
        }

        return response()->json(['message' => 'Avatar supprimé.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('tenant');

        if (! $user->tenant?->is_active) {
            return response()->json([
                'message' => 'Votre espace est suspendu ou introuvable.',
                'code' => 'TENANT_SUSPENDED',
            ], 403);
        }

        $this->tenantService->setCurrentTenant($user->tenant);

        return response()->json([
            'data' => $this->buildMePayload($user),
        ]);
    }

    /**
     * Retourne les succursales actives auxquelles l'utilisateur a accès.
     * Sans restriction (user_branches vide) → toutes les succursales actives du tenant.
     * Avec restriction → seulement celles explicitement attribuées.
     */
    private function buildAvailableBranches(User $user): array
    {
        $allBranches = Branch::where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get(['id', 'uid', 'name', 'type', 'is_active', 'display_order', 'address', 'phone']);

        $restrictedIds = DB::table('user_branches')
            ->where('user_id', $user->id)
            ->pluck('branch_id');

        $branches = $restrictedIds->isNotEmpty()
            ? $allBranches->whereIn('id', $restrictedIds)
            : $allBranches;

        return $branches->values()->map(fn ($b) => [
            'uid' => $b->uid,
            'name' => $b->name,
            'type' => $b->type,
            'is_active' => (bool) $b->is_active,
            'display_order' => $b->display_order,
            'address' => $b->address,
            'phone' => $b->phone,
        ])->all();
    }

    private function buildMePayload(User $user): array
    {
        $tenant = $this->tenantService->current();
        $subscription = $tenant->activeSubscription()->with('plan')->first();

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'locale' => $user->locale,
                'avatar' => $user->avatar_path
                    ? Storage::disk('public')->url($user->avatar_path)
                    : null,
                'is_active' => $user->is_active,
            ],
            'permissions' => $this->permissionService->getPermissions($user),
            'tenant' => [
                'api_key' => $tenant->getRawOriginal('api_key'),
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'currency' => $tenant->currency,
                'sector' => $tenant->sector,
                'locale' => $tenant->locale ?? 'fr',
                'timezone' => $tenant->timezone ?? 'Africa/Dakar',
                'rccm' => $tenant->rccm,
                'ninea' => $tenant->ninea,
                'primary_color' => $tenant->primary_color,
                'secondary_color' => $tenant->secondary_color,
                'logo_url' => $tenant->logo_path
                    ? Storage::disk('public')->url($tenant->logo_path)
                    : null,
            ],
            // Abonnement actif — utilisé par le frontend pour la bannière d'alerte
            'subscription' => $subscription ? [
                'status' => $subscription->status,
                'plan_name' => $subscription->plan?->name,
                'plan_slug' => $subscription->plan?->slug,
                'billing_cycle' => $subscription->billing_cycle,
                'ends_at' => $subscription->ends_at?->toISOString(),
                'days_remaining' => $subscription->daysUntilExpiry(),
            ] : null,
            // Features du plan — utilisé par la sidebar pour masquer les modules non inclus
            'plan_features' => $subscription?->plan ? [
                'pos' => (bool) $subscription->plan->feature_pos,
                'invoicing' => (bool) $subscription->plan->feature_invoicing,
                'purchases' => (bool) $subscription->plan->feature_purchases,
                'reports' => (bool) $subscription->plan->feature_reports,
                'shop' => (bool) $subscription->plan->feature_shop,
                'import_csv' => (bool) $subscription->plan->feature_import_csv,
                'stock_alerts' => (bool) $subscription->plan->feature_stock_alerts,
                'multi_user' => (bool) $subscription->plan->feature_multi_user,
                'custom_domain' => (bool) $subscription->plan->feature_custom_domain,
                'marketing' => (bool) $subscription->plan->feature_marketing,
                'max_branches' => (int) ($subscription->plan->max_branches ?? 1),
            ] : null,
            // Succursales accessibles — filtrées par les restrictions de l'utilisateur
            'available_branches' => $this->buildAvailableBranches($user),
        ];
    }
}
