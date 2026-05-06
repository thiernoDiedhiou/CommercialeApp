<?php

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Services\TenantService;

beforeEach(function () {
    [$this->tenant, $this->user] = $this->createTenantWithUser();

    // Initialise le contexte tenant et bypass les middlewares de permission
    // (CheckPermission est testé séparément dans TenantIsolationTest)
    app(TenantService::class)->setCurrentTenant($this->tenant);
    $this->actingAs($this->user, 'sanctum');
    $this->withoutMiddleware();
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeConfirmedSale($tenant, $user, float $total = 10000, float $cost = 5000): Sale
{
    $product = Product::factory()->create([
        'tenant_id'  => $tenant->id,
        'price'      => $total,
        'cost_price' => $cost,
    ]);

    $sale = Sale::create([
        'tenant_id'    => $tenant->id,
        'user_id'      => $user->id,
        'reference'    => 'VNT-' . now()->format('Y') . '-' . rand(10000, 99999),
        'subtotal'     => $total,
        'discount_type'   => null,
        'discount_value'  => 0,
        'discount_amount' => 0,
        'tax_amount'   => 0,
        'total'        => $total,
        'status'       => 'confirmed',
        'confirmed_at' => now(),
    ]);

    SaleItem::create([
        'sale_id'    => $sale->id,
        'product_id' => $product->id,
        'quantity'   => 1,
        'unit_price' => $total,
        'cost_price' => $cost,
        'discount'   => 0,
        'total'      => $total,
    ]);

    return $sale;
}

// ─── Rapport ventes ────────────────────────────────────────────────────────

it('returns sales report with correct structure', function () {
    $this->getJson('/api/v1/reports/sales')
        ->assertStatus(200)
        ->assertJsonStructure([
            'period'  => ['from', 'to'],
            'summary' => ['sales_count', 'revenue', 'profit', 'average_basket'],
            'chart',
        ]);
});

it('returns correct revenue — not overcounted by items join', function () {
    // Une vente avec un seul article — revenue doit être = total de la vente
    makeConfirmedSale($this->tenant, $this->user, 15000, 6000);

    $response = $this->getJson('/api/v1/reports/sales?from=' . now()->toDateString() . '&to=' . now()->toDateString())
        ->assertStatus(200);

    expect((float) $response->json('summary.revenue'))->toBe(15000.0);
    expect((float) $response->json('summary.profit'))->toBe(9000.0); // 15000 - 6000
    expect((int) $response->json('summary.sales_count'))->toBe(1);
});

it('revenue is not multiplied when a sale has multiple items', function () {
    // Deux articles sur une même vente → revenue = total de la vente (pas total × nb articles)
    $product1 = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price' => 5000, 'cost_price' => 2000]);
    $product2 = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price' => 3000, 'cost_price' => 1000]);

    $sale = Sale::create([
        'tenant_id'      => $this->tenant->id,
        'user_id'        => $this->user->id,
        'reference'      => 'VNT-TEST-MULTI',
        'subtotal'       => 8000,
        'discount_type'  => null,
        'discount_value' => 0, 'discount_amount' => 0, 'tax_amount' => 0,
        'total'          => 8000,
        'status'         => 'confirmed',
        'confirmed_at'   => now(),
    ]);

    SaleItem::create(['sale_id' => $sale->id, 'product_id' => $product1->id, 'quantity' => 1, 'unit_price' => 5000, 'cost_price' => 2000, 'discount' => 0, 'total' => 5000]);
    SaleItem::create(['sale_id' => $sale->id, 'product_id' => $product2->id, 'quantity' => 1, 'unit_price' => 3000, 'cost_price' => 1000, 'discount' => 0, 'total' => 3000]);

    $response = $this->getJson('/api/v1/reports/sales?from=' . now()->toDateString() . '&to=' . now()->toDateString())
        ->assertStatus(200);

    // Revenue = 8000 (pas 8000 × 2 = 16000)
    expect((float) $response->json('summary.revenue'))->toBe(8000.0);
    // Profit = (5000 - 2000) + (3000 - 1000) = 5000
    expect((float) $response->json('summary.profit'))->toBe(5000.0);
});

it('computes correct average basket', function () {
    makeConfirmedSale($this->tenant, $this->user, 10000);
    makeConfirmedSale($this->tenant, $this->user, 6000);

    $response = $this->getJson('/api/v1/reports/sales?from=' . now()->toDateString() . '&to=' . now()->toDateString())
        ->assertStatus(200);

    expect((float) $response->json('summary.revenue'))->toBe(16000.0);
    expect((float) $response->json('summary.average_basket'))->toBe(8000.0); // 16000 / 2
});

it('does not include cancelled sales in revenue', function () {
    makeConfirmedSale($this->tenant, $this->user, 10000);

    Sale::create([
        'tenant_id' => $this->tenant->id, 'user_id' => $this->user->id,
        'reference' => 'VNT-CANCELLED', 'subtotal' => 5000,
        'discount_type' => null, 'discount_value' => 0, 'discount_amount' => 0,
        'tax_amount' => 0, 'total' => 5000, 'status' => 'cancelled',
        'confirmed_at' => now(),
    ]);

    $response = $this->getJson('/api/v1/reports/sales?from=' . now()->toDateString() . '&to=' . now()->toDateString())
        ->assertStatus(200);

    expect((float) $response->json('summary.revenue'))->toBe(10000.0);
    expect((int) $response->json('summary.sales_count'))->toBe(1);
});

it('returns zero revenue when no sales exist', function () {
    $response = $this->getJson('/api/v1/reports/sales')
        ->assertStatus(200);

    expect((float) $response->json('summary.revenue'))->toBe(0.0);
    expect((int) $response->json('summary.sales_count'))->toBe(0);
});

it('groups by month when group_by=month', function () {
    makeConfirmedSale($this->tenant, $this->user, 5000);

    $this->getJson('/api/v1/reports/sales?group_by=month')
        ->assertStatus(200)
        ->assertJsonStructure(['chart' => [['period', 'revenue', 'sales_count', 'profit']]]);
});

it('handles invalid date range gracefully (swaps from/to)', function () {
    $this->getJson('/api/v1/reports/sales?from=2026-12-31&to=2026-01-01')
        ->assertStatus(200)
        ->assertJsonPath('period.from', '2026-01-01')
        ->assertJsonPath('period.to', '2026-12-31');
});

// ─── Rapport produits ──────────────────────────────────────────────────────

it('returns products report with correct structure', function () {
    $this->getJson('/api/v1/reports/products')
        ->assertStatus(200)
        ->assertJsonStructure(['period' => ['from', 'to'], 'data']);
});

it('returns top product with correct revenue', function () {
    makeConfirmedSale($this->tenant, $this->user, 12000, 4000);

    $response = $this->getJson('/api/v1/reports/products?from=' . now()->toDateString() . '&to=' . now()->toDateString())
        ->assertStatus(200);

    $data = $response->json('data');
    expect($data)->not->toBeEmpty();
    expect((float) $data[0]['revenue'])->toBe(12000.0);
    expect((float) $data[0]['profit'])->toBe(8000.0);
});

it('only shows products sold in the given period', function () {
    // Vente datée d'hier — hors de la plage "aujourd'hui"
    $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price' => 5000, 'cost_price' => 2000]);
    $oldSale = Sale::create([
        'tenant_id' => $this->tenant->id, 'user_id' => $this->user->id,
        'reference' => 'VNT-OLD', 'subtotal' => 5000,
        'discount_type' => null, 'discount_value' => 0, 'discount_amount' => 0,
        'tax_amount' => 0, 'total' => 5000, 'status' => 'confirmed',
        'confirmed_at' => now()->subDay(),
    ]);
    SaleItem::create(['sale_id' => $oldSale->id, 'product_id' => $product->id, 'quantity' => 1, 'unit_price' => 5000, 'cost_price' => 2000, 'discount' => 0, 'total' => 5000]);

    $response = $this->getJson('/api/v1/reports/products?from=' . now()->toDateString() . '&to=' . now()->toDateString())
        ->assertStatus(200);

    expect($response->json('data'))->toBeEmpty();
});

// ─── Rapport stock ─────────────────────────────────────────────────────────

it('returns stock report with correct structure', function () {
    $this->getJson('/api/v1/reports/stock')
        ->assertStatus(200)
        ->assertJsonStructure([
            'period'  => ['from', 'to'],
            'summary' => ['total_in', 'total_out', 'total_return', 'total_adjustment'],
            'data',
        ]);
});

it('counts stock movements correctly by type', function () {
    $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price' => 1000, 'cost_price' => 500, 'stock_quantity' => 10]);

    StockMovement::create([
        'tenant_id'   => $this->tenant->id,
        'product_id'  => $product->id,
        'user_id'     => $this->user->id,
        'type'        => 'in',
        'quantity'    => 20,
        'stock_before'=> 0,
        'stock_after' => 20,
        'source'      => 'purchase',
    ]);

    $response = $this->getJson('/api/v1/reports/stock?from=' . now()->toDateString() . '&to=' . now()->toDateString())
        ->assertStatus(200);

    expect((float) $response->json('summary.total_in'))->toBe(20.0);
    expect((float) $response->json('summary.total_out'))->toBe(0.0);
});

// ─── Export CSV ────────────────────────────────────────────────────────────

it('returns CSV for sales report', function () {
    $this->get('/api/v1/reports/sales?format=csv')
        ->assertStatus(200)
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
});

it('returns CSV for products report', function () {
    $this->get('/api/v1/reports/products?format=csv')
        ->assertStatus(200)
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
});

it('returns CSV for stock report', function () {
    $this->get('/api/v1/reports/stock?format=csv')
        ->assertStatus(200)
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
});

// ─── Isolation multi-tenant ────────────────────────────────────────────────

it('does not include sales from another tenant in revenue', function () {
    [$tenantB, $userB] = $this->createTenantWithUser();

    // Vente dans tenant courant
    makeConfirmedSale($this->tenant, $this->user, 10000);

    // Vente dans tenant B — ne doit pas apparaître
    app(TenantService::class)->setCurrentTenant($tenantB);
    makeConfirmedSale($tenantB, $userB, 50000);

    // Retour au tenant A
    app(TenantService::class)->setCurrentTenant($this->tenant);

    $response = $this->getJson('/api/v1/reports/sales?from=' . now()->toDateString() . '&to=' . now()->toDateString())
        ->assertStatus(200);

    expect((float) $response->json('summary.revenue'))->toBe(10000.0);
});

it('returns 403 when authenticated but missing reports.view permission', function () {
    // Réactive tous les middlewares — l'utilisateur est authentifié (actingAs dans beforeEach)
    // mais n'a aucune permission → CheckPermission renvoie 403
    $this->withMiddleware();

    $this->getJson('/api/v1/reports/sales', $this->makeHeaders($this->tenant))
        ->assertStatus(403);
});
