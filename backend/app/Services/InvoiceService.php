<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Tenant;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use LogicException;

class InvoiceService
{
    public function __construct(private readonly TenantService $tenantService) {}

    // ─── API publique ─────────────────────────────────────────────────────────

    /**
     * Crée une facture en statut 'draft' avec ses lignes.
     *
     * Ordre :
     *   1. Verrou tenant — sérialise la génération de référence FAC-YYYY-XXXXX
     *   2. Calculs financiers (bcmath)
     *   3. Création Invoice + InvoiceItems
     *
     * @param array{
     *   customer_id?: int|null,
     *   issue_date: string,
     *   due_date?: string|null,
     *   discount_type?: 'percent'|'fixed'|null,
     *   discount_value?: float,
     *   tax_rate?: float,
     *   notes?: string|null,
     *   footer?: string|null,
     *   items: array<array{
     *     product_id?: int|null,
     *     description: string,
     *     quantity: float,
     *     unit_price: float,
     *     discount?: float,
     *   }>
     * } $data
     */
    public function create(array $data): Invoice
    {
        return DB::transaction(function () use ($data) {
            $tenantId = $this->tenantService->currentId();

            Tenant::lockForUpdate()->findOrFail($tenantId);

            $reference = $this->generateReference($tenantId);

            [$subtotal, $discountAmount, $taxAmount, $total, $resolvedItems]
                = $this->computeTotals($data);

            $invoice = Invoice::create([
                'tenant_id'       => $tenantId,
                'customer_id'     => $data['customer_id'] ?? null,
                'user_id'         => Auth::id(),
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
            ]);

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

            return $invoice->load(['customer:id,name', 'user:id,name', 'items.product:id,name']);
        });
    }

    /**
     * Met à jour une facture en statut 'draft' (lignes remplacées intégralement).
     *
     * @throws LogicException  Facture non en statut draft
     */
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
            ]);

            if (isset($data['items'])) {
                $invoice->items()->delete();
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

            return $invoice->fresh(['customer:id,name', 'user:id,name', 'items.product:id,name']);
        });
    }

    /**
     * Envoie la facture (draft → sent).
     *
     * @throws LogicException  Facture non en statut draft
     */
    public function send(Invoice $invoice): Invoice
    {
        if (! $invoice->isSendable()) {
            throw new LogicException(
                "Seules les factures en statut 'draft' peuvent être envoyées. Statut actuel : {$invoice->status}"
            );
        }

        $invoice->update([
            'status'  => Invoice::STATUS_SENT,
            'sent_at' => now(),
        ]);

        return $invoice->fresh();
    }

    /**
     * Enregistre un paiement partiel ou total sur une facture.
     * Passe automatiquement à 'paid' si le montant total est atteint.
     * Tolérance de 1 FCFA pour les arrondis.
     *
     * @throws LogicException  Facture non payable, montant invalide
     */
    public function recordPayment(Invoice $invoice, float $amount): Invoice
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
        $maxAllowed = bcadd((string) $invoice->total, '1.00', 2); // tolérance 1 FCFA

        if (bccomp($newPaid, $maxAllowed, 2) > 0) {
            throw new LogicException(
                "Le paiement de {$amount} FCFA dépasserait le total ({$invoice->total} FCFA). Déjà encaissé : {$invoice->paid_amount} FCFA."
            );
        }

        $isPaid = bccomp($newPaid, (string) $invoice->total, 2) >= 0;

        $invoice->update([
            'paid_amount' => $newPaid,
            'status'      => $isPaid ? Invoice::STATUS_PAID : $invoice->status,
            'paid_at'     => $isPaid ? now() : null,
        ]);

        return $invoice->fresh();
    }

    /**
     * Passe les factures envoyées dont la date d'échéance est dépassée à 'overdue'.
     * Appelé par un job planifié ou `php artisan invoices:check-overdue`.
     *
     * @return int  Nombre de factures passées à 'overdue'
     */
    public function markOverdue(): int
    {
        return Invoice::where('status', Invoice::STATUS_SENT)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', now()->toDateString())
            ->update(['status' => Invoice::STATUS_OVERDUE]);
    }

    /**
     * Annule une facture (draft ou sent uniquement).
     *
     * @throws LogicException  Facture non annulable
     */
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

        return $invoice->fresh();
    }

    // ─── Calculs financiers ───────────────────────────────────────────────────

    /**
     * Calcule subtotal, discount, tax et total en bcmath.
     * Retourne aussi les items résolus avec leur line_total calculé.
     *
     * @return array{0: string, 1: string, 2: string, 3: string, 4: array}
     */
    private function computeTotals(array $data): array
    {
        $items = $data['items'] ?? [];

        // ── 1. Total par ligne ────────────────────────────────────────────────
        $resolvedItems = [];
        $subtotal = '0.00';

        foreach ($items as $item) {
            $gross     = bcmul((string) $item['unit_price'], (string) $item['quantity'], 2);
            $lineTotal = bcsub($gross, (string) ($item['discount'] ?? '0'), 2);

            $resolvedItems[] = array_merge($item, ['line_total' => $lineTotal]);
            $subtotal        = bcadd($subtotal, $lineTotal, 2);
        }

        // ── 2. Remise globale ─────────────────────────────────────────────────
        $discountAmount = match ($data['discount_type'] ?? null) {
            'percent' => bcmul($subtotal, bcdiv((string) ($data['discount_value'] ?? '0'), '100', 6), 2),
            'fixed'   => (string) ($data['discount_value'] ?? '0'),
            default   => '0.00',
        };

        // ── 3. TVA ────────────────────────────────────────────────────────────
        $taxable   = bcsub($subtotal, $discountAmount, 2);
        $taxAmount = bcmul($taxable, bcdiv((string) ($data['tax_rate'] ?? '0'), '100', 6), 2);

        // ── 4. Total ──────────────────────────────────────────────────────────
        $total = bcadd($taxable, $taxAmount, 2);

        return [$subtotal, $discountAmount, $taxAmount, $total, $resolvedItems];
    }

    // ─── Référence ────────────────────────────────────────────────────────────

    /**
     * Génère la prochaine référence FAC-YYYY-XXXXX.
     * Appelée après lockForUpdate() sur Tenant → unicité garantie.
     */
    private function generateReference(int $tenantId): string
    {
        $year   = now()->format('Y');
        $prefix = "FAC-{$year}-";

        $last = Invoice::where('tenant_id', $tenantId)
            ->where('reference', 'like', "{$prefix}%")
            ->max('reference');

        $seq = $last ? ((int) substr($last, -5)) + 1 : 1;

        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }
}
