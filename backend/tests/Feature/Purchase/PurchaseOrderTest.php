<?php

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use App\Services\PurchaseService;
use App\Services\TenantService;
use LogicException;

beforeEach(function () {
    [$this->tenant, $this->user] = $this->createTenantWithUser();
    app(TenantService::class)->setCurrentTenant($this->tenant);
    $this->actingAs($this->user);
    $this->service = app(PurchaseService::class);
});

// ─── Helper local ──────────────────────────────────────────────────────────

function purchasePayload(Product $product, float $qty = 5, float $cost = 800): array
{
    return [
        'items' => [[
            'product_id'       => $product->id,
            'quantity_ordered' => $qty,
            'unit_cost'        => $cost,
        ]],
    ];
}

function makeProduct($tenant, float $stock = 0): Product
{
    return Product::factory()->create([
        'tenant_id'      => $tenant->id,
        'stock_quantity' => $stock,
        'price'          => 1000,
        'cost_price'     => 500,
    ]);
}

// ─── Création ─────────────────────────────────────────────────────────────

it('generates a reference in ACH-YYYY-XXXXX format', function () {
    $order = $this->service->create(purchasePayload(makeProduct($this->tenant)));

    expect($order->reference)->toMatch('/^ACH-\d{4}-\d{5}$/');
});

it('creates an order in draft status', function () {
    $order = $this->service->create(purchasePayload(makeProduct($this->tenant)));

    expect($order->status)->toBe(PurchaseOrder::STATUS_DRAFT);
});

it('increments reference counter for subsequent orders', function () {
    $product = makeProduct($this->tenant);
    $order1  = $this->service->create(purchasePayload($product));
    $order2  = $this->service->create(purchasePayload($product));

    expect($order1->reference)->not->toBe($order2->reference);
    expect($order2->reference)->toMatch('/^ACH-\d{4}-\d{5}$/');
});

// ─── Confirmation ─────────────────────────────────────────────────────────

it('confirms a draft order — status becomes ordered', function () {
    $order = $this->service->create(purchasePayload(makeProduct($this->tenant)));

    $confirmed = $this->service->confirm($order);

    expect($confirmed->status)->toBe(PurchaseOrder::STATUS_ORDERED);
});

it('throws LogicException when confirming a non-draft order', function () {
    $order = $this->service->create(purchasePayload(makeProduct($this->tenant)));
    $order = $this->service->confirm($order);

    expect(fn () => $this->service->confirm($order))
        ->toThrow(LogicException::class);
});

// ─── Réception ────────────────────────────────────────────────────────────

it('increases product stock on full reception', function () {
    $product = makeProduct($this->tenant);
    $order   = $this->service->create(purchasePayload($product, 10));
    $order   = $this->service->confirm($order->fresh());
    $order->load('items');
    $item    = $order->items->first();

    $this->service->receive($order, [['id' => $item->id, 'quantity_received' => 10]]);

    expect((float) Product::find($product->id)->stock_quantity)->toBe(10.0);
});

it('sets status to received after full reception', function () {
    $product = makeProduct($this->tenant);
    $order   = $this->service->create(purchasePayload($product, 5));
    $order   = $this->service->confirm($order->fresh());
    $order->load('items');
    $item    = $order->items->first();

    $received = $this->service->receive($order, [['id' => $item->id, 'quantity_received' => 5]]);

    expect($received->status)->toBe(PurchaseOrder::STATUS_RECEIVED);
    expect($received->received_at)->not->toBeNull();
});

it('sets status to partial after partial reception', function () {
    $product = makeProduct($this->tenant);
    $order   = $this->service->create(purchasePayload($product, 10));
    $order   = $this->service->confirm($order->fresh());
    $order->load('items');
    $item    = $order->items->first();

    $received = $this->service->receive($order, [['id' => $item->id, 'quantity_received' => 4]]);

    expect($received->status)->toBe(PurchaseOrder::STATUS_PARTIAL);
    expect((float) Product::find($product->id)->stock_quantity)->toBe(4.0);
});

it('creates a stock movement of type "in" on reception', function () {
    $product = makeProduct($this->tenant);
    $order   = $this->service->create(purchasePayload($product, 8));
    $order   = $this->service->confirm($order->fresh());
    $order->load('items');
    $item    = $order->items->first();

    $this->service->receive($order, [['id' => $item->id, 'quantity_received' => 8]]);

    $movement = StockMovement::where('product_id', $product->id)->first();

    expect($movement)->not->toBeNull();
    expect($movement->type)->toBe('in');
    expect((float) $movement->quantity)->toBe(8.0);
    expect($movement->source)->toBe('purchase');
});

it('cumulates stock correctly across two partial receptions', function () {
    $product = makeProduct($this->tenant);
    $order   = $this->service->create(purchasePayload($product, 10));
    $order   = $this->service->confirm($order->fresh());
    $order->load('items');
    $item    = $order->items->first();

    $this->service->receive($order, [['id' => $item->id, 'quantity_received' => 6]]);
    $order->refresh()->load('items');
    $item = $order->items->first();

    $final = $this->service->receive($order, [['id' => $item->id, 'quantity_received' => 4]]);

    expect($final->status)->toBe(PurchaseOrder::STATUS_RECEIVED);
    expect((float) Product::find($product->id)->stock_quantity)->toBe(10.0);
});

it('throws LogicException when receiving more than reliquat', function () {
    $product = makeProduct($this->tenant);
    $order   = $this->service->create(purchasePayload($product, 5));
    $order   = $this->service->confirm($order->fresh());
    $order->load('items');
    $item    = $order->items->first();

    expect(fn () => $this->service->receive($order, [['id' => $item->id, 'quantity_received' => 99]]))
        ->toThrow(LogicException::class);
});

it('throws LogicException when receiving a non-receivable order (draft)', function () {
    $product = makeProduct($this->tenant);
    $order   = $this->service->create(purchasePayload($product, 5));
    $order->load('items');
    $item    = $order->items->first();

    expect(fn () => $this->service->receive($order, [['id' => $item->id, 'quantity_received' => 3]]))
        ->toThrow(LogicException::class);
});

it('does not change stock if reception throws', function () {
    $product = makeProduct($this->tenant);
    $order   = $this->service->create(purchasePayload($product, 5));
    $order   = $this->service->confirm($order->fresh());
    $order->load('items');
    $item    = $order->items->first();

    try {
        $this->service->receive($order, [['id' => $item->id, 'quantity_received' => 99]]);
    } catch (LogicException) {}

    expect((float) Product::find($product->id)->stock_quantity)->toBe(0.0);
});

// ─── Annulation ───────────────────────────────────────────────────────────

it('cancels a draft order', function () {
    $order = $this->service->create(purchasePayload(makeProduct($this->tenant)));

    $cancelled = $this->service->cancel($order);

    expect($cancelled->status)->toBe(PurchaseOrder::STATUS_CANCELLED);
});

it('cancels an ordered purchase order', function () {
    $order = $this->service->create(purchasePayload(makeProduct($this->tenant)));
    $order = $this->service->confirm($order->fresh());

    $cancelled = $this->service->cancel($order);

    expect($cancelled->status)->toBe(PurchaseOrder::STATUS_CANCELLED);
});

it('throws LogicException when cancelling a received order', function () {
    $product = makeProduct($this->tenant);
    $order   = $this->service->create(purchasePayload($product, 5));
    $order   = $this->service->confirm($order->fresh());
    $order->load('items');
    $item    = $order->items->first();
    $order   = $this->service->receive($order, [['id' => $item->id, 'quantity_received' => 5]]);

    expect(fn () => $this->service->cancel($order))
        ->toThrow(LogicException::class);
});

it('throws LogicException when cancelling a partial order', function () {
    $product = makeProduct($this->tenant);
    $order   = $this->service->create(purchasePayload($product, 10));
    $order   = $this->service->confirm($order->fresh());
    $order->load('items');
    $item    = $order->items->first();
    $order   = $this->service->receive($order, [['id' => $item->id, 'quantity_received' => 5]]);

    expect(fn () => $this->service->cancel($order))
        ->toThrow(LogicException::class);
});
