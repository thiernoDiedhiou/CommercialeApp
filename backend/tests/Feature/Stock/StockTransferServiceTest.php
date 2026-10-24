<?php

use App\Exceptions\StockInsufficientException;
use App\Models\Branch;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Services\BranchService;
use App\Services\StockTransferService;
use App\Services\TenantService;

beforeEach(function () {
    [$this->tenant, $this->user] = $this->createTenantWithUser();
    app(TenantService::class)->setCurrentTenant($this->tenant);
    $this->actingAs($this->user);

    $this->service = app(StockTransferService::class);

    // Deux succursales distinctes pour le tenant
    $this->branchA = Branch::create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Succursale A',
        'type' => 'principal',
        'is_active' => true,
        'display_order' => 1,
    ]);
    $this->branchB = Branch::create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Succursale B',
        'type' => 'sync',
        'is_active' => true,
        'display_order' => 2,
    ]);

    $this->product = Product::factory()->create([
        'tenant_id' => $this->tenant->id,
        'stock_quantity' => 50,
    ]);
});

// ── create() ──────────────────────────────────────────────────────────────────

it('creates a draft transfer with reference TRF-YYYY-XXXXX', function () {
    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 10]],
    );

    expect($transfer->status)->toBe('draft')
        ->and($transfer->reference)->toMatch('/^TRF-\d{4}-\d{5}$/')
        ->and($transfer->items)->toHaveCount(1)
        ->and($transfer->items->first()->quantity)->toBe(10.0);

    // Aucun mouvement de stock à ce stade
    expect(StockMovement::where('product_id', $this->product->id)->count())->toBe(0);
    expect(Product::find($this->product->id)->stock_quantity)->toBe(50.0);
});

it('throws LogicException when from_branch equals to_branch', function () {
    expect(fn () => $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchA,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 5]],
    ))->toThrow(LogicException::class);
});

it('throws LogicException when items list is empty', function () {
    expect(fn () => $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [],
    ))->toThrow(LogicException::class);
});

// ── send() ────────────────────────────────────────────────────────────────────

it('sends a draft transfer: status in_transit, deducts source stock', function () {
    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 15]],
    );

    app(BranchService::class)->setCurrentBranch($this->branchA);
    $sent = $this->service->send($transfer);

    expect($sent->status)->toBe('in_transit')
        ->and($sent->sent_at)->not->toBeNull();

    // Stock déduit sur la source
    expect(Product::find($this->product->id)->stock_quantity)->toBe(35.0);

    // Un mouvement de type 'out' avec source 'stock_transfer_out'
    $movement = StockMovement::where('product_id', $this->product->id)->first();
    expect($movement->type)->toBe('out')
        ->and($movement->source)->toBe('stock_transfer_out')
        ->and($movement->quantity)->toBe(15.0)
        ->and($movement->branch_id)->toBe($this->branchA->id);
});

it('throws LogicException when sending a non-draft transfer', function () {
    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 5]],
    );

    app(BranchService::class)->setCurrentBranch($this->branchA);
    $this->service->send($transfer);

    // Deuxième appel doit échouer
    expect(fn () => $this->service->send($transfer->fresh()))->toThrow(LogicException::class);
});

it('throws StockInsufficientException when source stock is insufficient', function () {
    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 999]],
    );

    app(BranchService::class)->setCurrentBranch($this->branchA);

    expect(fn () => $this->service->send($transfer))
        ->toThrow(StockInsufficientException::class);

    // Transfert toujours en draft (pas de commit partiel)
    expect($transfer->fresh()->status)->toBe('draft');
    expect(Product::find($this->product->id)->stock_quantity)->toBe(50.0);
});

// ── receive() ─────────────────────────────────────────────────────────────────

it('receives an in_transit transfer: status received, increments destination stock', function () {
    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 20]],
    );

    app(BranchService::class)->setCurrentBranch($this->branchA);
    $this->service->send($transfer);

    app(BranchService::class)->setCurrentBranch($this->branchB);
    $received = $this->service->receive($transfer->fresh());

    expect($received->status)->toBe('received')
        ->and($received->received_at)->not->toBeNull();

    // Stock net inchangé au niveau produit (déduit source + ajouté destination = même stock_quantity)
    // La colonne stock_quantity est globale (sans branch isolation) dans cet état du projet
    expect(Product::find($this->product->id)->stock_quantity)->toBe(50.0);

    // Deux mouvements : out sur source + in sur destination
    $movements = StockMovement::where('product_id', $this->product->id)->orderBy('id')->get();
    expect($movements)->toHaveCount(2);
    expect($movements[0]->type)->toBe('out')->and($movements[0]->branch_id)->toBe($this->branchA->id);
    expect($movements[1]->type)->toBe('in')->and($movements[1]->branch_id)->toBe($this->branchB->id);
});

it('throws LogicException when receiving a non in_transit transfer', function () {
    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 5]],
    );

    expect(fn () => $this->service->receive($transfer))->toThrow(LogicException::class);
});

// ── cancel() ──────────────────────────────────────────────────────────────────

it('cancels a draft transfer without any stock movement', function () {
    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 5]],
    );

    $cancelled = $this->service->cancel($transfer);

    expect($cancelled->status)->toBe('cancelled');
    expect(StockMovement::where('product_id', $this->product->id)->count())->toBe(0);
    expect(Product::find($this->product->id)->stock_quantity)->toBe(50.0);
});

it('cancels an in_transit transfer and restores source stock', function () {
    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 12]],
    );

    app(BranchService::class)->setCurrentBranch($this->branchA);
    $this->service->send($transfer);

    // Stock déduit de 12
    expect(Product::find($this->product->id)->stock_quantity)->toBe(38.0);

    app(BranchService::class)->setCurrentBranch($this->branchA);
    $cancelled = $this->service->cancel($transfer->fresh());

    expect($cancelled->status)->toBe('cancelled');
    // Stock restauré
    expect(Product::find($this->product->id)->stock_quantity)->toBe(50.0);

    // 2 mouvements : out (envoi) + in (annulation)
    expect(StockMovement::where('product_id', $this->product->id)->count())->toBe(2);
});

it('throws LogicException when cancelling a received transfer', function () {
    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 5]],
    );

    app(BranchService::class)->setCurrentBranch($this->branchA);
    $this->service->send($transfer);

    app(BranchService::class)->setCurrentBranch($this->branchB);
    $this->service->receive($transfer->fresh());

    expect(fn () => $this->service->cancel($transfer->fresh()))->toThrow(LogicException::class);
});

// ── Idempotence ───────────────────────────────────────────────────────────────

it('is idempotent — double send does not create duplicate stock movements', function () {
    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 10]],
    );

    app(BranchService::class)->setCurrentBranch($this->branchA);
    $this->service->send($transfer);

    // Simuler un double envoi en forçant le statut à draft
    // (normalement impossible via l'API, mais test de la couche service)
    StockTransfer::where('id', $transfer->id)->update(['status' => 'draft']);

    app(BranchService::class)->setCurrentBranch($this->branchA);
    $this->service->send($transfer->fresh());

    // StockService::adjust() retourne l'existant sur source=source_id identique
    // → toujours 1 mouvement par item
    expect(StockMovement::where('product_id', $this->product->id)
        ->where('source', 'stock_transfer_out')
        ->count()
    )->toBe(1);
});

// ── BranchService context restore ─────────────────────────────────────────────

it('restores BranchService context after send()', function () {
    $branchService = app(BranchService::class);
    $branchService->setCurrentBranch($this->branchA);

    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 5]],
    );

    $this->service->send($transfer);

    // Le contexte doit être restauré à branchA (contexte initial)
    expect($branchService->current()->id)->toBe($this->branchA->id);
});

it('restores BranchService context after a failed send()', function () {
    $branchService = app(BranchService::class);
    $branchService->setCurrentBranch($this->branchA);

    // Quantité impossible → StockInsufficientException dans send()
    $transfer = $this->service->create(
        fromBranch: $this->branchA,
        toBranch: $this->branchB,
        items: [['product_id' => $this->product->id, 'product_variant_id' => null, 'quantity' => 9999]],
    );

    try {
        $this->service->send($transfer);
    } catch (StockInsufficientException) {
        // attendu
    }

    // Contexte doit être restauré malgré l'exception
    expect($branchService->current()->id)->toBe($this->branchA->id);
});
