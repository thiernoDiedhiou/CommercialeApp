<?php

use App\Exceptions\SaleException;
use App\Exceptions\StockInsufficientException;
use App\Models\Product;
use App\Models\Sale;
use App\Services\SaleService;
use App\Services\TenantService;

beforeEach(function () {
    [$this->tenant, $this->user] = $this->createTenantWithUser();
    app(TenantService::class)->setCurrentTenant($this->tenant);
    $this->actingAs($this->user);
    $this->service = app(SaleService::class);
});

// ─── Helper local ──────────────────────────────────────────────────────────

function salePayload(Product $product, float $qty = 1, float $price = 1000, ?string $offlineId = null): array
{
    $data = [
        'items'    => [[
            'product_id' => $product->id,
            'quantity'   => $qty,
            'unit_price' => $price,
        ]],
        'payments' => [['method' => 'cash', 'amount' => $qty * $price]],
    ];

    if ($offlineId !== null) {
        $data['offline_id'] = $offlineId;
    }

    return $data;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

it('generates a reference in VNT-YYYY-XXXXX format', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 10,
        'price'          => 1000,
        'cost_price'     => 500,
    ]);

    $sale = $this->service->create(salePayload($product), $this->user);

    expect($sale->reference)->toMatch('/^VNT-\d{4}-\d{5}$/');
});

it('decrements product stock after sale', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 20,
        'price'          => 500,
        'cost_price'     => 200,
    ]);

    $this->service->create(salePayload($product, 3, 500), $this->user);

    expect(Product::find($product->id)->stock_quantity)->toBe(17.0);
});

it('throws StockInsufficientException when stock is insufficient', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 2,
        'price'          => 1000,
        'cost_price'     => 500,
    ]);

    expect(fn() => $this->service->create(salePayload($product, 10), $this->user))
        ->toThrow(StockInsufficientException::class);
});

it('rolls back — no sale or stock change when stock is insufficient', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 2,
        'price'          => 1000,
        'cost_price'     => 500,
    ]);

    try {
        $this->service->create(salePayload($product, 10), $this->user);
    } catch (StockInsufficientException) {}

    expect(Sale::count())->toBe(0);
    expect(Product::find($product->id)->stock_quantity)->toBe(2.0);
});

it('is idempotent with offline_id — second call returns the same sale', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 20,
        'price'          => 1000,
        'cost_price'     => 500,
    ]);

    $sale1 = $this->service->create(salePayload($product, 1, 1000, 'offline-abc-123'), $this->user);
    $sale2 = $this->service->create(salePayload($product, 1, 1000, 'offline-abc-123'), $this->user);

    expect($sale1->id)->toBe($sale2->id);
    expect(Sale::count())->toBe(1);
    expect(Product::find($product->id)->stock_quantity)->toBe(19.0); // décrémenté une seule fois
});

it('restores stock on cancel', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 10,
        'price'          => 500,
        'cost_price'     => 200,
    ]);

    $sale = $this->service->create(salePayload($product, 4, 500), $this->user);
    expect(Product::find($product->id)->stock_quantity)->toBe(6.0);

    $this->service->cancel($sale);

    expect(Product::find($product->id)->stock_quantity)->toBe(10.0);
});

it('throws SaleException when cancelling an already-cancelled sale', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 10,
        'price'          => 500,
        'cost_price'     => 200,
    ]);

    $sale      = $this->service->create(salePayload($product, 2, 500), $this->user);
    $cancelled = $this->service->cancel($sale);

    expect(fn() => $this->service->cancel($cancelled))
        ->toThrow(SaleException::class);
});

it('refuses a payment that exceeds total by more than 1 CFA', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 10,
        'price'          => 1000,
        'cost_price'     => 500,
    ]);

    // total = 1000, déjà payé 1000 dans salePayload, tentative d'ajout de 2 → 1002 > 1001
    $sale = $this->service->create(salePayload($product, 1, 1000), $this->user);

    expect(fn() => $this->service->addPayment($sale, 'cash', 2.00))
        ->toThrow(SaleException::class);
});
