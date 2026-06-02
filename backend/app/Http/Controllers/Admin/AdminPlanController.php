<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminPlanController extends Controller
{
    // ── GET /api/v1/admin/plans ───────────────────────────────────────────────

    public function index(): JsonResponse
    {
        // withCount émet 1 requête avec sous-requêtes — au lieu de N requêtes loadCount
        $plans = Plan::withCount([
            'subscriptions as active_subscribers_count' => fn ($q) => $q->where('status', 'active'),
            'subscriptions as trial_subscribers_count'  => fn ($q) => $q->where('status', 'trial'),
        ])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $plans]);
    }

    // ── POST /api/v1/admin/plans ──────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $plan = Plan::create($validated);

        return response()->json(['data' => $plan], 201);
    }

    // ── GET /api/v1/admin/plans/{plan} ────────────────────────────────────────

    public function show(Plan $plan): JsonResponse
    {
        $plan->loadCount('subscriptions');

        return response()->json(['data' => $plan]);
    }

    // ── PUT /api/v1/admin/plans/{plan} ────────────────────────────────────────

    public function update(Request $request, Plan $plan): JsonResponse
    {
        $validated = $request->validate($this->rules($plan->id));

        $plan->update($validated);

        return response()->json(['data' => $plan->fresh()]);
    }

    // ── DELETE /api/v1/admin/plans/{plan} ─────────────────────────────────────

    public function destroy(Plan $plan): JsonResponse
    {
        // Bloque la suppression si des abonnements actifs/essai y sont rattachés
        $activeCount = $plan->subscriptions()
            ->whereIn('status', ['trial', 'active'])
            ->count();

        if ($activeCount > 0) {
            return response()->json([
                'message' => "Impossible de supprimer ce plan : {$activeCount} abonnement(s) actif(s) y sont rattachés.",
                'code'    => 'PLAN_HAS_ACTIVE_SUBSCRIPTIONS',
            ], 422);
        }

        $plan->delete();

        return response()->json(null, 204);
    }

    // ─── Validation commune store/update ─────────────────────────────────────

    private function rules(?int $ignoreId = null): array
    {
        return [
            // Identité
            'name'                 => ['required', 'string', 'max:100'],
            'slug'                 => ['required', 'string', 'max:100', 'alpha_dash',
                                       Rule::unique('plans', 'slug')->ignore($ignoreId)],
            'tagline'              => ['nullable', 'string', 'max:255'],
            'badge'                => ['nullable', 'string', 'max:50'],
            'description'          => ['nullable', 'string'],
            'features'             => ['nullable', 'array'],
            'features.*'           => ['string', 'max:255'],
            'sort_order'           => ['nullable', 'integer', 'min:0'],
            'is_active'            => ['boolean'],
            'is_public'            => ['boolean'],

            // Tarification
            'price_monthly'        => ['required', 'numeric', 'min:0'],
            'price_yearly'         => ['nullable', 'numeric', 'min:0'],
            'yearly_discount_pct'  => ['nullable', 'integer', 'min:1', 'max:99'],
            'trial_days'           => ['nullable', 'integer', 'min:0', 'max:365'],

            // Limites
            'max_users'            => ['nullable', 'integer', 'min:0'],
            'max_products'         => ['nullable', 'integer', 'min:0'],
            'max_monthly_sales'    => ['nullable', 'integer', 'min:0'],

            // Feature flags
            'feature_pos'          => ['boolean'],
            'feature_invoicing'    => ['boolean'],
            'feature_purchases'    => ['boolean'],
            'feature_reports'      => ['boolean'],
            'feature_shop'         => ['boolean'],
            'feature_import_csv'   => ['boolean'],
            'feature_stock_alerts' => ['boolean'],
            'feature_multi_user'   => ['boolean'],
            'feature_custom_domain'=> ['boolean'],
        ];
    }
}
