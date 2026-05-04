<?php

use App\Models\Product;
use App\Models\Sale;
use App\Services\PosService;
use App\Services\TenantService;

beforeEach(function () {
    [$this->tenant, $this->user] = $this->createTenantWithUser();
    app(TenantService::class)->setCurrentTenant($this->tenant);
    $this->actingAs($this->user);
    $this->service = app(PosService::class);
});

// ─── Helper local ──────────────────────────────────────────────────────────

function posPayload(Product $product, string $offlineId, float $qty = 1, float $price = 1000): array
{
    return [
        'offline_id' => $offlineId,
        'items'      => [[
            'product_id' => $product->id,
            'quantity'   => $qty,
            'unit_price' => $price,
        ]],
        'payments'   => [['method' => 'cash', 'amount' => $qty * $price]],
    ];
}

// ─── Tests ─────────────────────────────────────────────────────────────────

it('processes a valid offline sale', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 20,
        'price'          => 1000,
        'cost_price'     => 500,
    ]);

    $result = $this->service->syncOffline([posPayload($product, 'offline-001')], $this->user);

    expect($result['processed'])->toBe(1)
        ->and($result['skipped'])->toBe(0)
        ->and($result['failed'])->toBeEmpty();

    expect(Sale::count())->toBe(1);
});

it('skips a sale with an already-synced offline_id', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 20,
        'price'          => 1000,
        'cost_price'     => 500,
    ]);
    $sales = [posPayload($product, 'offline-002')];

    $this->service->syncOffline($sales, $this->user); // première synchro
    $result = $this->service->syncOffline($sales, $this->user); // doublon

    expect($result['skipped'])->toBe(1)
        ->and($result['processed'])->toBe(0);

    expect(Sale::count())->toBe(1); // pas de doublon
    expect(Product::find($product->id)->stock_quantity)->toBe(19.0); // décrémenté une fois
});

it('marks a sale as failed when stock is insufficient', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 1,
        'price'          => 500,
        'cost_price'     => 200,
    ]);

    $result = $this->service->syncOffline(
        [posPayload($product, 'offline-003', 10)], // demande 10, seulement 1 dispo
        $this->user,
    );

    expect($result['failed'])->toHaveCount(1)
        ->and($result['failed'][0]['offline_id'])->toBe('offline-003')
        ->and($result['processed'])->toBe(0);

    expect(Sale::count())->toBe(0);
});

it('processes multiple offline sales independently', function () {
    $p1 = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 10,
        'price'          => 500,
        'cost_price'     => 200,
    ]);
    $p2 = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 5,
        'price'          => 800,
        'cost_price'     => 300,
    ]);

    $result = $this->service->syncOffline([
        posPayload($p1, 'offline-a', 2),
        posPayload($p2, 'offline-b', 3),
    ], $this->user);

    expect($result['processed'])->toBe(2)
        ->and($result['skipped'])->toBe(0)
        ->and($result['failed'])->toBeEmpty();

    expect(Sale::count())->toBe(2);
    expect(Product::find($p1->id)->stock_quantity)->toBe(8.0);
    expect(Product::find($p2->id)->stock_quantity)->toBe(2.0);
});

it('continues processing remaining sales when one fails', function () {
    $failing = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 0, // rupture
        'price'          => 500,
        'cost_price'     => 200,
    ]);
    $ok = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 10,
        'price'          => 1000,
        'cost_price'     => 400,
    ]);

    $result = $this->service->syncOffline([
        posPayload($failing, 'offline-fail', 1),
        posPayload($ok, 'offline-ok', 1),
    ], $this->user);

    expect($result['processed'])->toBe(1)
        ->and($result['failed'])->toHaveCount(1);

    expect(Sale::count())->toBe(1);
});
