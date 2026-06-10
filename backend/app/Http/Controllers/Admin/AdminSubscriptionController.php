<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminSubscriptionController extends Controller
{
    public function __construct(private readonly TenantService $tenantService) {}

    // ── GET /api/v1/admin/subscriptions ──────────────────────────────────────
    // Vue globale de tous les abonnements (dashboard MRR)

    public function index(Request $request): JsonResponse
    {
        $subscriptions = TenantSubscription::with(['tenant:id,name,slug,is_active', 'plan:id,name,slug,price_monthly'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('plan_id'), fn ($q) => $q->where('plan_id', $request->integer('plan_id')))
            ->orderByDesc('created_at')
            ->paginate(25);

        // MRR calculé à partir des abonnements actifs mensuels
        $mrr = TenantSubscription::join('plans', 'plans.id', '=', 'tenant_subscriptions.plan_id')
            ->where('tenant_subscriptions.status', 'active')
            ->where('tenant_subscriptions.billing_cycle', 'monthly')
            ->sum('plans.price_monthly');

        // Abonnements annuels ramenés en mensuel (÷ 12)
        $mrrFromYearly = TenantSubscription::join('plans', 'plans.id', '=', 'tenant_subscriptions.plan_id')
            ->where('tenant_subscriptions.status', 'active')
            ->where('tenant_subscriptions.billing_cycle', 'yearly')
            ->sum('plans.price_yearly');

        $totalMrr = bcadd((string) $mrr, bcdiv((string) $mrrFromYearly, '12', 2), 2);

        $items = $subscriptions->map(function (TenantSubscription $sub) {
            return array_merge($this->formatSubscription($sub), [
                'tenant' => [
                    'id'        => $sub->tenant?->id,
                    'name'      => $sub->tenant?->name,
                    'slug'      => $sub->tenant?->slug,
                    'is_active' => $sub->tenant?->is_active,
                ],
            ]);
        });

        return response()->json([
            'data'    => $items,
            'meta'    => [
                'current_page' => $subscriptions->currentPage(),
                'last_page'    => $subscriptions->lastPage(),
                'total'        => $subscriptions->total(),
                'per_page'     => $subscriptions->perPage(),
            ],
            'summary' => [
                'mrr'          => (float) $totalMrr,
                'trial_count'  => TenantSubscription::where('status', 'trial')->count(),
                'active_count' => TenantSubscription::where('status', 'active')->count(),
                'expired_count'=> TenantSubscription::where('status', 'expired')->count(),
            ],
        ]);
    }

    // ── GET /api/v1/admin/tenants/{tenant}/subscription ──────────────────────

    public function show(Tenant $tenant): JsonResponse
    {
        $subscription = $tenant->subscriptions()->with('plan')->first();

        return response()->json([
            'data' => $subscription ? $this->formatSubscription($subscription) : null,
        ]);
    }

    // ── GET /api/v1/admin/tenants/{tenant}/subscriptions ─────────────────────
    // Historique complet de tous les abonnements du tenant

    public function history(Tenant $tenant): JsonResponse
    {
        $subscriptions = $tenant->subscriptions()
            ->with('plan:id,name,slug,price_monthly')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($s) => $this->formatSubscription($s));

        return response()->json(['data' => $subscriptions]);
    }

    // ── POST /api/v1/admin/tenants/{tenant}/subscription ─────────────────────
    // Assigne ou renouvelle un abonnement à un tenant

    public function store(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'plan_id'       => ['required', 'integer', Rule::exists('plans', 'id')->where('is_active', true)],
            'billing_cycle' => ['required', Rule::in(['trial', 'monthly', 'yearly', 'lifetime'])],
            'starts_at'     => ['nullable', 'date'],
            'ends_at'       => ['nullable', 'date', 'after:starts_at'],
            'notes'         => ['nullable', 'string', 'max:1000'],
        ]);

        $plan     = Plan::findOrFail($validated['plan_id']);
        $startsAt = isset($validated['starts_at'])
            ? \Carbon\Carbon::parse($validated['starts_at'])
            : now();

        // Calcul automatique de ends_at si non fourni
        $endsAt = match (true) {
            isset($validated['ends_at'])                         => \Carbon\Carbon::parse($validated['ends_at']),
            $validated['billing_cycle'] === 'trial'              => $startsAt->copy()->addDays($plan->trial_days),
            $validated['billing_cycle'] === 'monthly'            => $startsAt->copy()->addMonth(),
            $validated['billing_cycle'] === 'yearly'             => $startsAt->copy()->addYear(),
            $validated['billing_cycle'] === 'lifetime'           => null,
            default                                              => $startsAt->copy()->addMonth(),
        };

        $status = $validated['billing_cycle'] === 'trial' ? 'trial' : 'active';

        // Expire les abonnements précédents
        $tenant->subscriptions()
            ->whereIn('status', ['trial', 'active'])
            ->update(['status' => 'expired']);

        $subscription = TenantSubscription::create([
            'tenant_id'     => $tenant->id,
            'plan_id'       => $plan->id,
            'billing_cycle' => $validated['billing_cycle'],
            'status'        => $status,
            'starts_at'     => $startsAt,
            'ends_at'       => $endsAt,
            'notes'         => $validated['notes'] ?? null,
        ]);

        // Réactive le tenant s'il était suspendu
        if (! $tenant->is_active) {
            $tenant->update(['is_active' => true]);
            $this->tenantService->flushCache($tenant->api_key);
        }

        return response()->json(['data' => $this->formatSubscription($subscription->load('plan'))], 201);
    }

    // ── PUT /api/v1/admin/tenants/{tenant}/subscription ──────────────────────
    // Modification de l'abonnement courant (prolongation, changement de notes…)

    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $subscription = $tenant->subscriptions()
            ->whereIn('status', ['trial', 'active'])
            ->firstOrFail();

        $validated = $request->validate([
            'ends_at' => ['nullable', 'date'],
            'status'  => ['sometimes', Rule::in(['trial', 'active', 'expired', 'cancelled'])],
            'notes'   => ['nullable', 'string', 'max:1000'],
        ]);

        $subscription->update($validated);

        // Synchronise is_active du tenant si l'abonnement est annulé/expiré
        if (in_array($validated['status'] ?? null, ['expired', 'cancelled'], true)) {
            $tenant->update(['is_active' => false]);
            $this->tenantService->flushCache($tenant->api_key);
        }

        return response()->json(['data' => $this->formatSubscription($subscription->fresh()->load('plan'))]);
    }

    // ─── Format ───────────────────────────────────────────────────────────────

    private function formatSubscription(TenantSubscription $sub): array
    {
        return [
            'id'            => $sub->id,
            'plan'          => $sub->plan ? [
                'id'   => $sub->plan->id,
                'name' => $sub->plan->name,
                'slug' => $sub->plan->slug,
            ] : null,
            'billing_cycle' => $sub->billing_cycle,
            'status'        => $sub->status,
            'starts_at'     => $sub->starts_at?->toISOString(),
            'ends_at'       => $sub->ends_at?->toISOString(),
            'days_remaining'=> $sub->daysUntilExpiry(),
            'notes'         => $sub->notes,
            'created_at'    => $sub->created_at?->toISOString(),
        ];
    }
}
