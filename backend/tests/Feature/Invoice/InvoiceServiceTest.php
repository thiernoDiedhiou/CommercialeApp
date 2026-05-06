<?php

use App\Models\Customer;
use App\Models\Invoice;
use App\Services\InvoiceService;
use App\Services\TenantService;
use LogicException;

beforeEach(function () {
    [$this->tenant, $this->user] = $this->createTenantWithUser();
    app(TenantService::class)->setCurrentTenant($this->tenant);
    $this->actingAs($this->user);
    $this->service = app(InvoiceService::class);
});

// ─── Helper local ──────────────────────────────────────────────────────────

function invoicePayload(float $price = 5000, float $discount = 0, float $taxRate = 0): array
{
    return [
        'issue_date' => now()->toDateString(),
        'tax_rate'   => $taxRate,
        'items'      => [[
            'description' => 'Prestation de service',
            'quantity'    => 1,
            'unit_price'  => $price,
            'discount'    => $discount,
        ]],
    ];
}

// ─── Création ─────────────────────────────────────────────────────────────

it('generates a reference in FAC-YYYY-XXXXX format', function () {
    $invoice = $this->service->create(invoicePayload());

    expect($invoice->reference)->toMatch('/^FAC-\d{4}-\d{5}$/');
});

it('creates an invoice in draft status', function () {
    $invoice = $this->service->create(invoicePayload());

    expect($invoice->status)->toBe(Invoice::STATUS_DRAFT);
    expect($invoice->paid_amount)->toBe('0.00');
});

it('increments reference counter for subsequent invoices', function () {
    $inv1 = $this->service->create(invoicePayload());
    $inv2 = $this->service->create(invoicePayload());

    expect($inv1->reference)->not->toBe($inv2->reference);
    expect($inv2->reference)->toMatch('/^FAC-\d{4}-\d{5}$/');
});

it('calculates subtotal and total correctly', function () {
    $invoice = $this->service->create(invoicePayload(price: 10000));

    expect((float) $invoice->subtotal)->toBe(10000.0);
    expect((float) $invoice->total)->toBe(10000.0);
});

it('applies percent discount correctly', function () {
    $invoice = $this->service->create([
        'issue_date'     => now()->toDateString(),
        'discount_type'  => 'percent',
        'discount_value' => 10, // 10%
        'items'          => [['description' => 'X', 'quantity' => 1, 'unit_price' => 10000, 'discount' => 0]],
    ]);

    expect((float) $invoice->discount_amount)->toBe(1000.0); // 10% de 10000
    expect((float) $invoice->total)->toBe(9000.0);
});

it('applies fixed discount correctly', function () {
    $invoice = $this->service->create([
        'issue_date'     => now()->toDateString(),
        'discount_type'  => 'fixed',
        'discount_value' => 500,
        'items'          => [['description' => 'X', 'quantity' => 1, 'unit_price' => 5000, 'discount' => 0]],
    ]);

    expect((float) $invoice->discount_amount)->toBe(500.0);
    expect((float) $invoice->total)->toBe(4500.0);
});

it('applies tax rate correctly', function () {
    $invoice = $this->service->create(invoicePayload(price: 10000, taxRate: 18));

    expect((float) $invoice->tax_amount)->toBe(1800.0); // 18% de 10000
    expect((float) $invoice->total)->toBe(11800.0);
});

it('applies line-level discount on items', function () {
    $invoice = $this->service->create(invoicePayload(price: 5000, discount: 500));

    expect((float) $invoice->subtotal)->toBe(4500.0); // 5000 - 500
    expect((float) $invoice->total)->toBe(4500.0);
});

it('persists items with correct totals', function () {
    $invoice = $this->service->create(invoicePayload(price: 3000));
    $invoice->load('items');

    expect($invoice->items)->toHaveCount(1);
    expect((float) $invoice->items->first()->total)->toBe(3000.0);
});

// ─── Envoi ────────────────────────────────────────────────────────────────

it('sends a draft invoice — status becomes sent', function () {
    $invoice = $this->service->create(invoicePayload());
    $sent    = $this->service->send($invoice);

    expect($sent->status)->toBe(Invoice::STATUS_SENT);
    expect($sent->sent_at)->not->toBeNull();
});

it('throws LogicException when sending a non-draft invoice', function () {
    $invoice = $this->service->create(invoicePayload());
    $invoice = $this->service->send($invoice);

    expect(fn () => $this->service->send($invoice))
        ->toThrow(LogicException::class);
});

// ─── Paiement ─────────────────────────────────────────────────────────────

it('records a partial payment and keeps status as sent', function () {
    $invoice = $this->service->create(invoicePayload(price: 10000));
    $invoice = $this->service->send($invoice->fresh());

    $result = $this->service->recordPayment($invoice, 4000);

    expect((float) $result->paid_amount)->toBe(4000.0);
    expect($result->status)->toBe(Invoice::STATUS_SENT);
});

it('marks invoice as paid when full amount is received', function () {
    $invoice = $this->service->create(invoicePayload(price: 5000));
    $invoice = $this->service->send($invoice->fresh());

    $paid = $this->service->recordPayment($invoice, 5000);

    expect($paid->status)->toBe(Invoice::STATUS_PAID);
    expect($paid->paid_at)->not->toBeNull();
});

it('marks invoice as paid with 1 FCFA tolerance', function () {
    $invoice = $this->service->create(invoicePayload(price: 5000));
    $invoice = $this->service->send($invoice->fresh());

    // Paiement légèrement supérieur (arrondi XOF) — tolérance 1 FCFA
    $paid = $this->service->recordPayment($invoice, 5001);

    expect($paid->status)->toBe(Invoice::STATUS_PAID);
});

it('throws LogicException when payment exceeds total + 1 FCFA', function () {
    $invoice = $this->service->create(invoicePayload(price: 5000));
    $invoice = $this->service->send($invoice->fresh());

    expect(fn () => $this->service->recordPayment($invoice, 5002))
        ->toThrow(LogicException::class);
});

it('throws LogicException when paying a draft invoice', function () {
    $invoice = $this->service->create(invoicePayload());

    expect(fn () => $this->service->recordPayment($invoice, 1000))
        ->toThrow(LogicException::class);
});

it('cumulates payments correctly', function () {
    $invoice = $this->service->create(invoicePayload(price: 10000));
    $invoice = $this->service->send($invoice->fresh());

    $this->service->recordPayment($invoice, 3000);
    $invoice->refresh();
    $result = $this->service->recordPayment($invoice, 7000);

    expect($result->status)->toBe(Invoice::STATUS_PAID);
    expect((float) $result->paid_amount)->toBe(10000.0);
});

// ─── Annulation ───────────────────────────────────────────────────────────

it('cancels a draft invoice', function () {
    $invoice   = $this->service->create(invoicePayload());
    $cancelled = $this->service->cancel($invoice);

    expect($cancelled->status)->toBe(Invoice::STATUS_CANCELLED);
    expect($cancelled->cancelled_at)->not->toBeNull();
});

it('cancels a sent invoice', function () {
    $invoice   = $this->service->create(invoicePayload());
    $invoice   = $this->service->send($invoice->fresh());
    $cancelled = $this->service->cancel($invoice);

    expect($cancelled->status)->toBe(Invoice::STATUS_CANCELLED);
});

it('throws LogicException when cancelling a paid invoice', function () {
    $invoice = $this->service->create(invoicePayload(price: 1000));
    $invoice = $this->service->send($invoice->fresh());
    $invoice = $this->service->recordPayment($invoice, 1000);

    expect(fn () => $this->service->cancel($invoice))
        ->toThrow(LogicException::class);
});

// ─── Passage en retard ────────────────────────────────────────────────────

it('marks overdue invoices — sent + past due date', function () {
    $invoice = $this->service->create([
        'issue_date' => now()->subDays(10)->toDateString(),
        'due_date'   => now()->subDays(3)->toDateString(), // échéance dépassée
        'items'      => [['description' => 'X', 'quantity' => 1, 'unit_price' => 1000, 'discount' => 0]],
    ]);
    $this->service->send($invoice->fresh());

    $count = $this->service->markOverdue();

    expect($count)->toBe(1);
    expect(Invoice::first()->status)->toBe(Invoice::STATUS_OVERDUE);
});

it('does not mark paid invoices as overdue', function () {
    $invoice = $this->service->create([
        'issue_date' => now()->subDays(10)->toDateString(),
        'due_date'   => now()->subDays(3)->toDateString(),
        'items'      => [['description' => 'X', 'quantity' => 1, 'unit_price' => 1000, 'discount' => 0]],
    ]);
    $invoice = $this->service->send($invoice->fresh());
    $this->service->recordPayment($invoice, 1000);

    $count = $this->service->markOverdue();

    expect($count)->toBe(0);
});

// ─── Mise à jour ──────────────────────────────────────────────────────────

it('updates a draft invoice', function () {
    $invoice = $this->service->create(invoicePayload(price: 5000));
    $updated = $this->service->update($invoice, [
        'items' => [['description' => 'Nouveau service', 'quantity' => 2, 'unit_price' => 3000, 'discount' => 0]],
    ]);

    expect((float) $updated->subtotal)->toBe(6000.0);
    expect((float) $updated->total)->toBe(6000.0);
});

it('throws LogicException when updating a sent invoice', function () {
    $invoice = $this->service->create(invoicePayload());
    $invoice = $this->service->send($invoice->fresh());

    expect(fn () => $this->service->update($invoice, ['notes' => 'test']))
        ->toThrow(LogicException::class);
});
