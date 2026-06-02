<?php

namespace App\Http\Middleware;

use App\Models\Plan;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscription
{
    public function __construct(private readonly TenantService $tenantService) {}

    public function handle(Request $request, Closure $next, string ...$features): Response
    {
        // Routes sans tenant (admin, boutique publique) passent directement
        if (! $this->tenantService->hasCurrentTenant()) {
            return $next($request);
        }

        $tenant = $this->tenantService->current();

        // Charge l'abonnement actif avec son plan (1 requête)
        $subscription = $tenant->activeSubscription()->with('plan')->first();

        // ── Pas d'abonnement valide → 402 ────────────────────────────────────
        if (! $subscription || ! $subscription->isValid()) {
            return response()->json([
                'message' => 'Votre abonnement a expiré. Veuillez contacter votre administrateur.',
                'code'    => 'SUBSCRIPTION_EXPIRED',
            ], 402);
        }

        $plan = $subscription->plan;

        if (! $plan || ! $plan->is_active) {
            return response()->json([
                'message' => 'Plan introuvable ou désactivé. Veuillez contacter votre administrateur.',
                'code'    => 'PLAN_UNAVAILABLE',
            ], 402);
        }

        // ── Vérification des features demandées ──────────────────────────────
        foreach ($features as $feature) {
            $column = 'feature_' . $feature;

            if (! ($plan->{$column} ?? false)) {
                return response()->json([
                    'message' => "Cette fonctionnalité n'est pas incluse dans votre plan \"{$plan->name}\".",
                    'code'    => 'FEATURE_NOT_IN_PLAN',
                    'feature' => $feature,
                    'plan'    => $plan->name,
                ], 403);
            }
        }

        // ── Vérification des limites quantitatives ───────────────────────────
        if ($limitResponse = $this->checkLimits($request, $plan, $tenant)) {
            return $limitResponse;
        }

        return $next($request);
    }

    /**
     * Vérifie les limites du plan (max_users, max_products).
     * 0 = illimité — on ne vérifie pas.
     * Retourne une Response 402 si la limite est atteinte, null sinon.
     */
    private function checkLimits(Request $request, Plan $plan, Tenant $tenant): ?Response
    {
        // Injecte le plan dans la requête pour les controllers qui en ont besoin
        $request->attributes->set('subscription_plan', $plan);

        // Les limites ne s'appliquent qu'à la création (POST)
        if (! $request->isMethod('POST')) {
            return null;
        }

        $path = $request->getPathInfo();

        // ── Limite utilisateurs ───────────────────────────────────────────────
        if ($plan->max_users > 0 && preg_match('#/v1/users$#', $path)) {
            $count = User::where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->count();

            if ($count >= $plan->max_users) {
                return response()->json([
                    'message' => "Limite de {$plan->max_users} utilisateurs actifs atteinte pour le plan \"{$plan->name}\".",
                    'code'    => 'PLAN_LIMIT_EXCEEDED',
                    'limit'   => 'max_users',
                    'current' => $count,
                    'max'     => $plan->max_users,
                ], 402);
            }
        }

        // ── Limite produits ───────────────────────────────────────────────────
        if ($plan->max_products > 0 && preg_match('#/v1/products$#', $path)) {
            $count = Product::where('tenant_id', $tenant->id)->count();

            if ($count >= $plan->max_products) {
                return response()->json([
                    'message' => "Limite de {$plan->max_products} produits atteinte pour le plan \"{$plan->name}\".",
                    'code'    => 'PLAN_LIMIT_EXCEEDED',
                    'limit'   => 'max_products',
                    'current' => $count,
                    'max'     => $plan->max_products,
                ], 402);
            }
        }

        return null;
    }
}
