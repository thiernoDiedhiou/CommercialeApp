<?php

namespace App\Services;

use App\Events\InvoiceCancelled;
use App\Events\InvoiceCreated;
use App\Events\InvoicePaid;
use App\Events\InvoiceSent;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoicePayment;
use App\Models\Tenant;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use LogicException;

class InvoiceService
{
    public function __construct(private readonly TenantService $tenantService) {}

    // ─── Création facture / devis ─────────────────────────────────────────────

    public function create(array $data): Invoice
    {
        return DB::transaction(function () use ($data) {
            $tenantId = $this->tenantService->currentId();
            $type     = $data['type'] ?? Invoice::TYPE_INVOICE;

            Tenant::lockForUpdate()->findOrFail($tenantId);

            $reference = $this->generateReference($tenantId, $type);

            [$subtotal, $discountAmount, $taxAmount, $total, $resolvedItems]
                = $this->computeTotals($data);

            $invoice = Invoice::create([
                'tenant_id'       => $tenantId,
                'customer_id'     => $data['customer_id'] ?? null,
                'user_id'         => Auth::id(),
                'type'            => $type,
                'reference'       => $reference,
                'status'          => Invoice::STATUS_DRAFT,
                'issue_date'      => $data['issue_date'],
                'due_date'        => $data['due_date'] ?? null,
                'subtotal'        => $subtotal,
                'discount_type'   => $data['discount_type'] ?? null,
                'discount_value'  => $data['discount_value'] ?? 0,
                'discount_amount' => $discountAmount,
                'tax_rate'        => $data['tax_rate'] ?? 0,
                'tax_amount'      => $taxAmount,
                'total'           => $total,
                'paid_amount'     => 0,
                'notes'           => $data['notes'] ?? null,
                'footer'          => $data['footer'] ?? null,
                'pdf_template'    => $data['pdf_template'] ?? null,
            ]);

            $this->saveItems($invoice, $resolvedItems);

            $invoice->load(['customer:id,name', 'user:id,name', 'items.product:id,name']);

            InvoiceCreated::dispatch($invoice);

            return $invoice;
        });
    }

    public function update(Invoice $invoice, array $data): Invoice
    {
        if (! $invoice->isDraft()) {
            throw new LogicException(
                "Seules les factures en statut 'draft' peuvent être modifiées. Statut actuel : {$invoice->status}"
            );
        }

        return DB::transaction(function () use ($invoice, $data) {
            [$subtotal, $discountAmount, $taxAmount, $total, $resolvedItems]
                = $this->computeTotals($data);

            $invoice->update([
                'customer_id'     => array_key_exists('customer_id', $data) ? $data['customer_id'] : $invoice->customer_id,
                'issue_date'      => $data['issue_date'] ?? $invoice->issue_date,
                'due_date'        => array_key_exists('due_date', $data) ? $data['due_date'] : $invoice->due_date,
                'subtotal'        => $subtotal,
                'discount_type'   => $data['discount_type'] ?? $invoice->discount_type,
                'discount_value'  => $data['discount_value'] ?? $invoice->discount_value,
                'discount_amount' => $discountAmount,
                'tax_rate'        => $data['tax_rate'] ?? $invoice->tax_rate,
                'tax_amount'      => $taxAmount,
                'total'           => $total,
                'notes'           => array_key_exists('notes', $data) ? $data['notes'] : $invoice->notes,
                'footer'          => array_key_exists('footer', $data) ? $data['footer'] : $invoice->footer,
                'pdf_template'    => array_key_exists('pdf_template', $data) ? $data['pdf_template'] : $invoice->pdf_template,
            ]);

            if (isset($data['items'])) {
                $invoice->items()->delete();
                $this->saveItems($invoice, $resolvedItems);
            }

            return $invoice->fresh(['customer:id,name', 'user:id,name', 'items.product:id,name']);
        });
    }

    // ─── Duplication ──────────────────────────────────────────────────────────

    public function duplicate(Invoice $invoice): Invoice
    {
        return DB::transaction(function () use ($invoice) {
            $tenantId  = $this->tenantService->currentId();
            $type      = $invoice->type;

            Tenant::lockForUpdate()->findOrFail($tenantId);

            $reference = $this->generateReference($tenantId, $type);
            $items     = $invoice->items()->get();

            $copy = Invoice::create([
                'tenant_id'       => $tenantId,
                'customer_id'     => $invoice->customer_id,
                'user_id'         => Auth::id(),
                'type'            => $type,
                'reference'       => $reference,
                'status'          => Invoice::STATUS_DRAFT,
                'issue_date'      => now()->toDateString(),
                'due_date'        => null,
                'subtotal'        => $invoice->subtotal,
                'discount_type'   => $invoice->discount_type,
                'discount_value'  => $invoice->discount_value,
                'discount_amount' => $invoice->discount_amount,
                'tax_rate'        => $invoice->tax_rate,
                'tax_amount'      => $invoice->tax_amount,
                'total'           => $invoice->total,
                'paid_amount'     => 0,
                'notes'           => $invoice->notes,
                'footer'          => $invoice->footer,
                'pdf_template'    => $invoice->pdf_template,
            ]);

            foreach ($items as $item) {
                InvoiceItem::create([
                    'invoice_id'  => $copy->id,
                    'product_id'  => $item->product_id,
                    'description' => $item->description,
                    'quantity'    => $item->quantity,
                    'unit_price'  => $item->unit_price,
                    'discount'    => $item->discount,
                    'total'       => $item->total,
                ]);
            }

            return $copy->load(['customer:id,name', 'user:id,name', 'items.product:id,name']);
        });
    }

    // ─── Conversion devis → facture ───────────────────────────────────────────

    public function convertToInvoice(Invoice $quote): Invoice
    {
        if (! $quote->isConvertible()) {
            throw new LogicException(
                "Ce devis ne peut pas être converti en facture (statut : {$quote->status}, déjà converti ou type incorrect)."
            );
        }

        return DB::transaction(function () use ($quote) {
            $tenantId = $this->tenantService->currentId();

            Tenant::lockForUpdate()->findOrFail($tenantId);

            $reference = $this->generateReference($tenantId, Invoice::TYPE_INVOICE);
            $items     = $quote->items()->get();

            $invoice = Invoice::create([
                'tenant_id'       => $tenantId,
                'customer_id'     => $quote->customer_id,
                'user_id'         => Auth::id(),
                'type'            => Invoice::TYPE_INVOICE,
                'reference'       => $reference,
                'status'          => Invoice::STATUS_DRAFT,
                'issue_date'      => now()->toDateString(),
                'due_date'        => $quote->due_date,
                'subtotal'        => $quote->subtotal,
                'discount_type'   => $quote->discount_type,
                'discount_value'  => $quote->discount_value,
                'discount_amount' => $quote->discount_amount,
                'tax_rate'        => $quote->tax_rate,
                'tax_amount'      => $quote->tax_amount,
                'total'           => $quote->total,
                'paid_amount'     => 0,
                'notes'           => $quote->notes,
                'footer'          => $quote->footer,
                'pdf_template'    => $quote->pdf_template,
            ]);

            foreach ($items as $item) {
                InvoiceItem::create([
                    'invoice_id'  => $invoice->id,
                    'product_id'  => $item->product_id,
                    'description' => $item->description,
                    'quantity'    => $item->quantity,
                    'unit_price'  => $item->unit_price,
                    'discount'    => $item->discount,
                    'total'       => $item->total,
                ]);
            }

            // Marque le devis comme converti
            $quote->update([
                'status'          => Invoice::STATUS_CANCELLED,
                'converted_to_id' => $invoice->id,
                'cancelled_at'    => now(),
            ]);

            return $invoice->load(['customer:id,name', 'user:id,name', 'items.product:id,name']);
        });
    }

    // ─── Avoir (note de crédit) ───────────────────────────────────────────────

    public function createCreditNote(Invoice $invoice): Invoice
    {
        if (! $invoice->isCreditNoteEligible()) {
            throw new LogicException(
                "Un avoir ne peut être créé que sur une facture payée. Statut actuel : {$invoice->status}."
            );
        }

        return DB::transaction(function () use ($invoice) {
            $tenantId = $this->tenantService->currentId();

            Tenant::lockForUpdate()->findOrFail($tenantId);

            $reference = $this->generateReference($tenantId, 'credit_note');
            $items     = $invoice->items()->get();

            $creditNote = Invoice::create([
                'tenant_id'          => $tenantId,
                'customer_id'        => $invoice->customer_id,
                'user_id'            => Auth::id(),
                'type'               => Invoice::TYPE_INVOICE,
                'reference'          => $reference,
                'status'             => Invoice::STATUS_DRAFT,
                'issue_date'         => now()->toDateString(),
                'subtotal'           => $invoice->subtotal,
                'discount_type'      => $invoice->discount_type,
                'discount_value'     => $invoice->discount_value,
                'discount_amount'    => $invoice->discount_amount,
                'tax_rate'           => $invoice->tax_rate,
                'tax_amount'         => $invoice->tax_amount,
                'total'              => $invoice->total,
                'paid_amount'        => 0,
                'notes'              => "Avoir relatif à la facture {$invoice->reference}",
                'footer'             => $invoice->footer,
                'credit_note_for_id' => $invoice->id,
            ]);

            foreach ($items as $item) {
                InvoiceItem::create([
                    'invoice_id'  => $creditNote->id,
                    'product_id'  => $item->product_id,
                    'description' => $item->description,
                    'quantity'    => $item->quantity,
                    'unit_price'  => $item->unit_price,
                    'discount'    => $item->discount,
                    'total'       => $item->total,
                ]);
            }

            return $creditNote->load(['customer:id,name', 'user:id,name', 'items.product:id,name']);
        });
    }

    // ─── Envoi ────────────────────────────────────────────────────────────────

    public function send(Invoice $invoice): Invoice
    {
        if (! $invoice->isSendable()) {
            throw new LogicException(
                "Seuls les documents en statut 'draft' peuvent être envoyés. Statut actuel : {$invoice->status}"
            );
        }

        $invoice->update([
            'status'  => Invoice::STATUS_SENT,
            'sent_at' => now(),
        ]);

        InvoiceSent::dispatch($invoice);

        return $invoice->fresh();
    }

    // ─── Paiements ────────────────────────────────────────────────────────────

    public function recordPayment(Invoice $invoice, float $amount, array $extra = []): Invoice
    {
        if (! $invoice->isPayable()) {
            throw new LogicException(
                "Impossible d'enregistrer un paiement sur une facture {$invoice->status}."
            );
        }

        if ($amount <= 0) {
            throw new LogicException('Le montant du paiement doit être supérieur à 0.');
        }

        $newPaid    = bcadd((string) $invoice->paid_amount, (string) $amount, 2);
        $maxAllowed = bcadd((string) $invoice->total, '1.00', 2);

        if (bccomp($newPaid, $maxAllowed, 2) > 0) {
            throw new LogicException(
                "Le paiement de {$amount} FCFA dépasserait le total ({$invoice->total} FCFA). Déjà encaissé : {$invoice->paid_amount} FCFA."
            );
        }

        $isPaid = bccomp($newPaid, (string) $invoice->total, 2) >= 0;

        DB::transaction(function () use ($invoice, $amount, $extra, $newPaid, $isPaid) {
            InvoicePayment::create([
                'invoice_id' => $invoice->id,
                'tenant_id'  => $invoice->tenant_id,
                'user_id'    => Auth::id(),
                'amount'     => $amount,
                'method'     => $extra['method'] ?? 'cash',
                'paid_at'    => $extra['paid_at'] ?? now()->toDateString(),
                'reference'  => $extra['reference'] ?? null,
                'note'       => $extra['note'] ?? null,
            ]);

            $invoice->update([
                'paid_amount' => $newPaid,
                'status'      => $isPaid ? Invoice::STATUS_PAID : $invoice->status,
                'paid_at'     => $isPaid ? now() : null,
            ]);
        });

        InvoicePaid::dispatch($invoice->fresh());

        return $invoice->fresh();
    }

    // ─── Relance ──────────────────────────────────────────────────────────────

    public function incrementReminder(Invoice $invoice): Invoice
    {
        $invoice->update([
            'reminder_count'   => $invoice->reminder_count + 1,
            'last_reminder_at' => now(),
        ]);

        return $invoice->fresh();
    }

    // ─── Overdue / Annulation ─────────────────────────────────────────────────

    public function markOverdue(): int
    {
        return Invoice::where('type', Invoice::TYPE_INVOICE)
            ->where('status', Invoice::STATUS_SENT)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', now()->toDateString())
            ->update(['status' => Invoice::STATUS_OVERDUE]);
    }

    public function cancel(Invoice $invoice): Invoice
    {
        if (! $invoice->isCancellable()) {
            throw new LogicException(
                "La facture {$invoice->reference} ne peut pas être annulée (statut : {$invoice->status})."
            );
        }

        $invoice->update([
            'status'       => Invoice::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);

        InvoiceCancelled::dispatch($invoice);

        return $invoice->fresh();
    }

    // ─── Calculs financiers ───────────────────────────────────────────────────

    private function computeTotals(array $data): array
    {
        $items = $data['items'] ?? [];

        $resolvedItems = [];
        $subtotal = '0.00';

        foreach ($items as $item) {
            $gross     = bcmul((string) $item['unit_price'], (string) $item['quantity'], 2);
            $lineTotal = bcsub($gross, (string) ($item['discount'] ?? '0'), 2);

            $resolvedItems[] = array_merge($item, ['line_total' => $lineTotal]);
            $subtotal        = bcadd($subtotal, $lineTotal, 2);
        }

        $discountAmount = match ($data['discount_type'] ?? null) {
            'percent' => bcmul($subtotal, bcdiv((string) ($data['discount_value'] ?? '0'), '100', 6), 2),
            'fixed'   => (string) ($data['discount_value'] ?? '0'),
            default   => '0.00',
        };

        $taxable   = bcsub($subtotal, $discountAmount, 2);
        $taxAmount = bcmul($taxable, bcdiv((string) ($data['tax_rate'] ?? '0'), '100', 6), 2);
        $total     = bcadd($taxable, $taxAmount, 2);

        return [$subtotal, $discountAmount, $taxAmount, $total, $resolvedItems];
    }

    private function saveItems(Invoice $invoice, array $resolvedItems): void
    {
        foreach ($resolvedItems as $item) {
            InvoiceItem::create([
                'invoice_id'  => $invoice->id,
                'product_id'  => $item['product_id'] ?? null,
                'description' => $item['description'],
                'quantity'    => $item['quantity'],
                'unit_price'  => $item['unit_price'],
                'discount'    => $item['discount'] ?? 0,
                'total'       => $item['line_total'],
            ]);
        }
    }

    // ─── Référence ────────────────────────────────────────────────────────────

    private function generateReference(int $tenantId, string $type): string
    {
        $year = now()->format('Y');

        if ($type === Invoice::TYPE_QUOTE) {
            $base = 'DEV';
        } elseif ($type === 'credit_note') {
            $base = 'AVO';
        } else {
            $base = strtoupper(
                preg_replace('/[^A-Z0-9]/', '', mb_strtoupper(
                    $this->tenantService->setting('invoice_prefix') ?? 'FAC'
                ))
            ) ?: 'FAC';
        }

        $prefix = "{$base}-{$year}-";

        $last = Invoice::where('tenant_id', $tenantId)
            ->where('reference', 'like', "{$prefix}%")
            ->max('reference');

        $seq = $last ? ((int) substr($last, -5)) + 1 : 1;

        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }
}
