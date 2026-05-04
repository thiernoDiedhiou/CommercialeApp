<?php

use App\Exceptions\StockInsufficientException;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Services\StockService;
use App\Services\TenantService;

beforeEach(function () {
    [$this->tenant, $this->user] = $this->createTenantWithUser();
    app(TenantService::class)->setCurrentTenant($this->tenant);
    $this->actingAs($this->user);
    $this->service = app(StockService::class);
});

it('increases product stock on adjust type in', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 10,
    ]);

    $movement = $this->service->adjust($product, 'in', 5, 'manual');

    expect($movement->stock_after)->toBe(15.0)
        ->and($movement->type)->toBe('in');

    expect(Product::find($product->id)->stock_quantity)->toBe(15.0);
});

it('decreases product stock on adjust type out', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 20,
    ]);

    $movement = $this->service->adjust($product, 'out', 8, 'manual');

    expect($movement->stock_after)->toBe(12.0);
    expect(Product::find($product->id)->stock_quantity)->toBe(12.0);
});

it('throws StockInsufficientException when stock is insufficient for out', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 3,
    ]);

    expect(fn() => $this->service->adjust($product, 'out', 10, 'manual'))
        ->toThrow(StockInsufficientException::class);
});

it('is idempotent — same source+source_id creates only one movement', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 50,
    ]);

    $this->service->adjust($product, 'in', 10, 'purchase', 99);
    $this->service->adjust($product, 'in', 10, 'purchase', 99); // duplicate

    expect(StockMovement::where('product_id', $product->id)->count())->toBe(1);
    expect(Product::find($product->id)->stock_quantity)->toBe(60.0);
});

it('adjusts variant stock without touching parent product stock', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'has_variants'   => true,
        'stock_quantity' => 0,
    ]);
    // ProductVariant n'a pas HasFactory — création directe (creating hook injecte tenant_id)
    $variant = ProductVariant::create([
        'product_id'        => $product->id,
        'stock_quantity'    => 30,
        'price'             => 1000,
        'attribute_summary' => 'M / Rouge',
        'is_active'         => true,
    ]);

    $this->service->adjust($product, 'out', 5, 'manual', null, $variant);

    expect(ProductVariant::find($variant->id)->stock_quantity)->toBe(25.0);
    expect(Product::find($product->id)->stock_quantity)->toBe(0.0); // parent intact
});

it('throws LogicException when trying to update a StockMovement', function () {
    $product  = Product::factory()->create(['tenant_id' => $this->tenant->id, 'stock_quantity' => 10]);
    $movement = $this->service->adjust($product, 'in', 5, 'manual');

    expect(fn() => $movement->update(['notes' => 'tampered']))
        ->toThrow(LogicException::class);
});

it('throws LogicException when trying to delete a StockMovement', function () {
    $product  = Product::factory()->create(['tenant_id' => $this->tenant->id, 'stock_quantity' => 10]);
    $movement = $this->service->adjust($product, 'in', 5, 'manual');

    expect(fn() => $movement->delete())
        ->toThrow(LogicException::class);
});

it('decreases stock with a negative adjustment quantity', function () {
    $product = Product::factory()->create([
        'tenant_id'      => $this->tenant->id,
        'stock_quantity' => 20,
    ]);

    $movement = $this->service->adjust($product, 'adjustment', -7, 'manual');

    expect($movement->stock_after)->toBe(13.0);
    expect(Product::find($product->id)->stock_quantity)->toBe(13.0);
});
