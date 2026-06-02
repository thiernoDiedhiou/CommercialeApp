<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminStatsController extends Controller
{
    public function index(): JsonResponse
    {
        // ── KPIs tenants + users (1 requête au lieu de 3) ───────────────────
        $tenantStats = DB::table('tenants')
            ->selectRaw('
                COUNT(*)                   AS total,
                SUM(is_active = 1)         AS active,
                SUM(is_active = 0)         AS inactive
            ')
            ->first();

        $usersTotal = DB::table('users')->count();

        // ── KPIs abonnements (1 requête au lieu de 3) ────────────────────────
        $subStats = DB::table('tenant_subscriptions')
            ->selectRaw("
                SUM(status = 'trial')    AS trial_count,
                SUM(status = 'active')   AS active_count,
                SUM(status = 'expired')  AS expired_count
            ")
            ->first();

        // ── MRR (2 requêtes JOIN inévitables) ────────────────────────────────
        $mrrMonthly = TenantSubscription::join('plans', 'plans.id', '=', 'tenant_subscriptions.plan_id')
            ->where('tenant_subscriptions.status', 'active')
            ->where('tenant_subscriptions.billing_cycle', 'monthly')
            ->sum('plans.price_monthly');

        $mrrFromYearly = TenantSubscription::join('plans', 'plans.id', '=', 'tenant_subscriptions.plan_id')
            ->where('tenant_subscriptions.status', 'active')
            ->where('tenant_subscriptions.billing_cycle', 'yearly')
            ->sum('plans.price_yearly');

        $mrr = (float) bcadd((string) $mrrMonthly, bcdiv((string) $mrrFromYearly, '12', 2), 2);
        $arr = (float) bcmul((string) $mrr, '12', 2);

        // ── Tenants en danger ────────────────────────────────────────────────

        $expiringSoon = TenantSubscription::with(['tenant:id,name,slug,is_active', 'plan:id,name,slug'])
            ->whereIn('status', ['trial', 'active'])
            ->whereNotNull('ends_at')
            ->whereBetween('ends_at', [now(), now()->addDays(7)])
            ->orderBy('ends_at')
            ->get()
            ->map(fn ($s) => [
                'tenant_id'      => $s->tenant?->id,
                'tenant_name'    => $s->tenant?->name,
                'tenant_slug'    => $s->tenant?->slug,
                'plan_name'      => $s->plan?->name,
                'status'         => $s->status,
                'ends_at'        => $s->ends_at?->toISOString(),
                'days_remaining' => $s->daysUntilExpiry(),
            ]);

        $withoutSubscription = Tenant::where('is_active', true)
            ->whereDoesntHave('subscriptions', fn ($q) =>
                $q->whereIn('status', ['trial', 'active'])
                  ->where(fn ($q2) => $q2->whereNull('ends_at')->orWhere('ends_at', '>', now()))
            )
            ->get(['id', 'name', 'slug'])
            ->map(fn ($t) => [
                'tenant_id'   => $t->id,
                'tenant_name' => $t->name,
                'tenant_slug' => $t->slug,
            ]);

        // ── Tenants récents ──────────────────────────────────────────────────
        $tenantsRecent = Tenant::latest()
            ->limit(5)
            ->get(['id', 'name', 'sector', 'is_active', 'created_at']);

        return response()->json([
            'data' => [
                'tenants_total'    => (int) $tenantStats->total,
                'tenants_active'   => (int) $tenantStats->active,
                'tenants_inactive' => (int) $tenantStats->inactive,
                'users_total'      => $usersTotal,

                'trial_count'   => (int) $subStats->trial_count,
                'active_count'  => (int) $subStats->active_count,
                'expired_count' => (int) $subStats->expired_count,
                'mrr'           => $mrr,
                'arr'           => $arr,

                'expiring_soon'        => $expiringSoon,
                'without_subscription' => $withoutSubscription,
                'tenants_recent'       => $tenantsRecent,
            ],
        ]);
    }
}
