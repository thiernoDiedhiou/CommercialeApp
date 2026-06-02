<?php

use App\Http\Middleware\CheckSubscription;
use App\Models\Plan;
use App\Models\Product;
use App\Models\TenantSubscription;
use App\Services\TenantService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

// ─── Helpers locaux ────────────────────────────────────────────────────────

function makePlan(array $overrides = []): Plan
{
    return Plan::create(array_merge([
        'name'              => 'Test Plan',
        'slug'              => 'test-plan-' . uniqid(),
        'price_monthly'     => 10000,
        'price_yearly'      => null,
        'trial_days'        => 14,
        'is_active'         => true,
        'is_public'         => true,
        'max_users'         => 0,
        'max_products'      => 0,
        'max_monthly_sales' => 0,
        'feature_pos'            => true,
        'feature_invoicing'      => false,
        'feature_purchases'      => false,
        'feature_reports'        => false,
        'feature_shop'           => false,
        'feature_import_csv'     => false,
        'feature_stock_alerts'   => false,
        'feature_multi_user'     => false,
        'feature_custom_domain'  => false,
        'sort_order'        => 0,
    ], $overrides));
}

function makeSubscription(int $tenantId, Plan $plan, array $overrides = []): TenantSubscription
{
    return TenantSubscription::create(array_merge([
        'tenant_id'     => $tenantId,
        'plan_id'       => $plan->id,
        'billing_cycle' => 'monthly',
        'status'        => 'active',
        'starts_at'     => now()->subDay(),
        'ends_at'       => now()->addMonth(),
    ], $overrides));
}

// ── Middleware helper ──────────────────────────────────────────────────────

function runSubscriptionMiddleware(Request $request, string ...$features): \Illuminate\Http\JsonResponse|\Symfony\Component\HttpFoundation\Response
{
    $middleware = app(CheckSubscription::class);
    return $middleware->handle($request, fn ($_) => response()->json(['ok' => true]), ...$features);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Modèle TenantSubscription
// ═══════════════════════════════════════════════════════════════════════════

describe('TenantSubscription::isValid()', function () {

    it('returns true for an active subscription not yet expired', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        $sub = makeSubscription($tenant->id, $plan, ['status' => 'active', 'ends_at' => now()->addDays(10)]);

        expect($sub->isValid())->toBeTrue();
    });

    it('returns true for a trial subscription not yet expired', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        $sub = makeSubscription($tenant->id, $plan, ['status' => 'trial', 'ends_at' => now()->addDays(5)]);

        expect($sub->isValid())->toBeTrue();
    });

    it('returns true for a lifetime subscription (ends_at null)', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        $sub = makeSubscription($tenant->id, $plan, ['status' => 'active', 'ends_at' => null]);

        expect($sub->isValid())->toBeTrue();
    });

    it('returns false for expired status even if ends_at is in future', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        $sub = makeSubscription($tenant->id, $plan, ['status' => 'expired', 'ends_at' => now()->addDays(5)]);

        expect($sub->isValid())->toBeFalse();
    });

    it('returns false for active status when ends_at is in the past', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        $sub = makeSubscription($tenant->id, $plan, ['status' => 'active', 'ends_at' => now()->subDay()]);

        expect($sub->isValid())->toBeFalse();
    });

    it('returns false for cancelled subscription', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        $sub = makeSubscription($tenant->id, $plan, ['status' => 'cancelled']);

        expect($sub->isValid())->toBeFalse();
    });
});

describe('TenantSubscription::daysUntilExpiry()', function () {

    it('returns null for lifetime subscription', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        $sub = makeSubscription($tenant->id, $plan, ['ends_at' => null]);

        expect($sub->daysUntilExpiry())->toBeNull();
    });

    it('returns positive days when subscription is active', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        // addDays(7)->endOfDay() évite le décalage de quelques secondes entre
        // la création et l'appel à diffInDays (qui arrondit à l'entier inférieur)
        $sub = makeSubscription($tenant->id, $plan, ['ends_at' => now()->addDays(7)->endOfDay()]);

        expect($sub->daysUntilExpiry())->toBeGreaterThanOrEqual(6)->toBeLessThanOrEqual(7);
    });

    it('returns 0 or negative when subscription has passed', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        $sub = makeSubscription($tenant->id, $plan, ['ends_at' => now()->subDay()]);

        expect($sub->daysUntilExpiry())->toBeLessThanOrEqual(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Middleware CheckSubscription
// ═══════════════════════════════════════════════════════════════════════════

describe('CheckSubscription middleware', function () {

    beforeEach(function () {
        [$this->tenant, $this->user] = $this->createTenantWithUser();
        app(TenantService::class)->setCurrentTenant($this->tenant);
    });

    it('returns 402 when tenant has no subscription', function () {
        $request = Request::create('/api/v1/users', 'GET');

        $response = runSubscriptionMiddleware($request);

        expect($response->getStatusCode())->toBe(402)
            ->and($response->getData(true)['code'])->toBe('SUBSCRIPTION_EXPIRED');
    });

    it('returns 402 when subscription is expired', function () {
        $plan = makePlan();
        makeSubscription($this->tenant->id, $plan, [
            'status'  => 'expired',
            'ends_at' => now()->subDay(),
        ]);

        $request = Request::create('/api/v1/users', 'GET');
        $response = runSubscriptionMiddleware($request);

        expect($response->getStatusCode())->toBe(402);
    });

    it('returns 402 when active subscription has passed its end date', function () {
        $plan = makePlan();
        makeSubscription($this->tenant->id, $plan, [
            'status'  => 'active',
            'ends_at' => now()->subHour(),
        ]);

        $request = Request::create('/api/v1/dashboard/summary', 'GET');
        $response = runSubscriptionMiddleware($request);

        expect($response->getStatusCode())->toBe(402);
    });

    it('passes through with a valid active subscription', function () {
        $plan = makePlan();
        makeSubscription($this->tenant->id, $plan);

        $request = Request::create('/api/v1/dashboard/summary', 'GET');
        $response = runSubscriptionMiddleware($request);

        expect($response->getStatusCode())->toBe(200)
            ->and($response->getData(true)['ok'])->toBeTrue();
    });

    it('returns 403 when required feature is not in plan', function () {
        $plan = makePlan(['feature_invoicing' => false]);
        makeSubscription($this->tenant->id, $plan);

        $request = Request::create('/api/v1/invoices', 'GET');
        $response = runSubscriptionMiddleware($request, 'invoicing');

        expect($response->getStatusCode())->toBe(403)
            ->and($response->getData(true)['code'])->toBe('FEATURE_NOT_IN_PLAN');
    });

    it('passes through when required feature is in plan', function () {
        $plan = makePlan(['feature_invoicing' => true]);
        makeSubscription($this->tenant->id, $plan);

        $request = Request::create('/api/v1/invoices', 'GET');
        $response = runSubscriptionMiddleware($request, 'invoicing');

        expect($response->getStatusCode())->toBe(200);
    });

    it('returns 402 when max_users limit is reached on POST /users', function () {
        $plan = makePlan(['max_users' => 2]);
        makeSubscription($this->tenant->id, $plan);

        // Crée exactement 2 utilisateurs actifs (la limite)
        $this->createUser($this->tenant, ['is_active' => true]);
        $this->createUser($this->tenant, ['is_active' => true]);

        $request = Request::create('/api/v1/users', 'POST');
        $response = runSubscriptionMiddleware($request);

        expect($response->getStatusCode())->toBe(402)
            ->and($response->getData(true)['code'])->toBe('PLAN_LIMIT_EXCEEDED')
            ->and($response->getData(true)['limit'])->toBe('max_users');
    });

    it('allows user creation when under max_users limit', function () {
        $plan = makePlan(['max_users' => 5]);
        makeSubscription($this->tenant->id, $plan);

        $this->createUser($this->tenant, ['is_active' => true]);

        $request = Request::create('/api/v1/users', 'POST');
        $response = runSubscriptionMiddleware($request);

        expect($response->getStatusCode())->toBe(200);
    });

    it('returns 402 when max_products limit is reached on POST /products', function () {
        $plan = makePlan(['max_products' => 3]);
        makeSubscription($this->tenant->id, $plan);

        // Crée exactement 3 produits (la limite)
        Product::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);

        $request = Request::create('/api/v1/products', 'POST');
        $response = runSubscriptionMiddleware($request);

        expect($response->getStatusCode())->toBe(402)
            ->and($response->getData(true)['code'])->toBe('PLAN_LIMIT_EXCEEDED')
            ->and($response->getData(true)['limit'])->toBe('max_products');
    });

    it('does not apply limits on GET requests', function () {
        $plan = makePlan(['max_products' => 1]);
        makeSubscription($this->tenant->id, $plan);
        Product::factory()->count(5)->create(['tenant_id' => $this->tenant->id]);

        $request = Request::create('/api/v1/products', 'GET');
        $response = runSubscriptionMiddleware($request);

        // GET ne déclenche pas la vérification de limite → passe
        expect($response->getStatusCode())->toBe(200);
    });

    it('ignores limits when max is 0 (unlimited plan)', function () {
        $plan = makePlan(['max_products' => 0]);
        makeSubscription($this->tenant->id, $plan);
        Product::factory()->count(1000)->create(['tenant_id' => $this->tenant->id]);

        $request = Request::create('/api/v1/products', 'POST');
        $response = runSubscriptionMiddleware($request);

        expect($response->getStatusCode())->toBe(200);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Commande ExpireSubscriptions
// ═══════════════════════════════════════════════════════════════════════════

describe('ExpireSubscriptions command', function () {

    beforeEach(function () {
        Mail::fake();
    });

    it('marks overdue subscriptions as expired', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();

        $sub = makeSubscription($tenant->id, $plan, [
            'status'  => 'active',
            'ends_at' => now()->subHour(),
        ]);

        $this->artisan('subscription:expire')->assertSuccessful();

        expect($sub->fresh()->status)->toBe('expired');
    });

    it('suspends the tenant when subscription expires', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        $tenant->update(['is_active' => true]);

        makeSubscription($tenant->id, $plan, [
            'status'  => 'active',
            'ends_at' => now()->subHour(),
        ]);

        $this->artisan('subscription:expire');

        expect($tenant->fresh()->is_active)->toBeFalse();
    });

    it('does not expire a subscription that ends in the future', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();

        $sub = makeSubscription($tenant->id, $plan, [
            'status'  => 'active',
            'ends_at' => now()->addDays(10),
        ]);

        $this->artisan('subscription:expire');

        expect($sub->fresh()->status)->toBe('active');
    });

    it('does not send duplicate notification for same threshold', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        $this->createUser($tenant, ['email' => 'admin@test.sn', 'is_active' => true]);

        $sub = makeSubscription($tenant->id, $plan, [
            'status'  => 'active',
            'ends_at' => now()->addDay(),
        ]);

        // Marque le palier J-1 comme déjà notifié
        $sub->markNotified(1);

        $this->artisan('subscription:expire');

        // Aucun email envoyé car le palier a déjà été traité
        Mail::assertNothingSent();
    });

    it('sends notification only for the matching threshold window', function () {
        $plan = makePlan();
        [$tenant] = $this->createTenantWithUser();
        $this->createUser($tenant, ['email' => 'admin@test.sn', 'is_active' => true]);

        // 5 jours → fenêtre J-7 (]1, 7]) — pas J-1
        makeSubscription($tenant->id, $plan, [
            'status'  => 'active',
            'ends_at' => now()->addDays(5),
        ]);

        $this->artisan('subscription:expire');

        // Seul le palier J-7 doit être marqué
        $sub = TenantSubscription::first();
        expect($sub->alreadyNotified(7))->toBeTrue()
            ->and($sub->alreadyNotified(1))->toBeFalse();
    });
});
