<?php

namespace App\Services;

use App\Exceptions\StockInsufficientException;
use App\Models\Branch;
use App\Models\StockTransfer;
use App\Models\Tenant;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use LogicException;

class StockTransferService
{
    public function __construct(
        private readonly TenantService $tenantService,
        private readonly BranchService $branchService,
        private readonly StockService $stockService,
    ) {}

    // ─── API publique ─────────────────────────────────────────────────────────

    /**
     * Crée un transfert en statut `draft`.
     *
     * @param  array{product_id:int, product_variant_id:int|null, quantity:float, notes:string|null}[]  $items
     */
    public function create(
        Branch $fromBranch,
        Branch $toBranch,
        array $items,
        ?string $notes = null,
    ): StockTransfer {
        if ($fromBranch->id === $toBranch->id) {
            throw new LogicException('Les succursales source et destination doivent être différentes.');
        }

        if (empty($items)) {
            throw new LogicException('Un transfert doit contenir au moins un article.');
        }

        return DB::transaction(function () use ($fromBranch, $toBranch, $items, $notes): StockTransfer {
            $tenant = $this->tenantService->current();
            $reference = $this->generateReference($tenant);

            $transfer = StockTransfer::create([
                'tenant_id' => $tenant->id,
                'from_branch_id' => $fromBranch->id,
                'to_branch_id' => $toBranch->id,
                'reference' => $reference,
                'status' => 'draft',
                'notes' => $notes,
                'created_by' => Auth::id(),
            ]);

            foreach ($items as $row) {
                $transfer->items()->create([
                    'product_id' => $row['product_id'],
                    'product_variant_id' => $row['product_variant_id'] ?? null,
                    'quantity' => $row['quantity'],
                    'notes' => $row['notes'] ?? null,
                ]);
            }

            return $transfer->load(['items.product', 'items.variant', 'fromBranch', 'toBranch']);
        });
    }

    /**
     * Expédie le transfert : draft → in_transit.
     * Déduit le stock de la succursale source.
     *
     * @throws LogicException Statut incompatible
     * @throws StockInsufficientException Stock insuffisant
     */
    public function send(StockTransfer $transfer): StockTransfer
    {
        if (! $transfer->isDraft()) {
            throw new LogicException("Seul un transfert en brouillon peut être expédié (statut actuel : {$transfer->status}).");
        }

        $transfer->load(['items.product', 'items.variant', 'fromBranch']);

        $previousBranch = $this->branchService->hasCurrentBranch()
            ? $this->branchService->current()
            : null;

        try {
            // Déduire le stock depuis la succursale source
            $this->branchService->setCurrentBranch($transfer->fromBranch);

            DB::transaction(function () use ($transfer): void {
                foreach ($transfer->items as $item) {
                    $this->stockService->adjust(
                        product: $item->product,
                        type: 'out',
                        quantity: $item->quantity,
                        source: 'stock_transfer_out',
                        sourceId: $item->id,
                        variant: $item->variant,
                        notes: "Transfert sortant #{$transfer->reference} → {$transfer->toBranch?->name}",
                    );
                }

                $transfer->update([
                    'status' => 'in_transit',
                    'sent_at' => now(),
                ]);
            });
        } finally {
            $previousBranch
                ? $this->branchService->setCurrentBranch($previousBranch)
                : $this->branchService->reset();
        }

        return $transfer->refresh();
    }

    /**
     * Réceptionne le transfert : in_transit → received.
     * Incrémente le stock de la succursale destination.
     */
    public function receive(StockTransfer $transfer): StockTransfer
    {
        if (! $transfer->isInTransit()) {
            throw new LogicException("Seul un transfert en transit peut être réceptionné (statut actuel : {$transfer->status}).");
        }

        $transfer->load(['items.product', 'items.variant', 'toBranch']);

        $previousBranch = $this->branchService->hasCurrentBranch()
            ? $this->branchService->current()
            : null;

        try {
            // Ajouter le stock à la succursale destination
            $this->branchService->setCurrentBranch($transfer->toBranch);

            DB::transaction(function () use ($transfer): void {
                foreach ($transfer->items as $item) {
                    $this->stockService->adjust(
                        product: $item->product,
                        type: 'in',
                        quantity: $item->quantity,
                        source: 'stock_transfer_in',
                        sourceId: $item->id,
                        variant: $item->variant,
                        notes: "Transfert entrant #{$transfer->reference} ← {$transfer->fromBranch?->name}",
                    );
                }

                $transfer->update([
                    'status' => 'received',
                    'received_at' => now(),
                    'received_by' => Auth::id(),
                ]);
            });
        } finally {
            $previousBranch
                ? $this->branchService->setCurrentBranch($previousBranch)
                : $this->branchService->reset();
        }

        return $transfer->refresh();
    }

    /**
     * Annule le transfert.
     * Si in_transit : réintègre le stock dans la succursale source.
     */
    public function cancel(StockTransfer $transfer): StockTransfer
    {
        if ($transfer->isReceived() || $transfer->isCancelled()) {
            throw new LogicException("Un transfert {$transfer->status} ne peut pas être annulé.");
        }

        if ($transfer->isInTransit()) {
            $transfer->load(['items.product', 'items.variant', 'fromBranch']);

            $previousBranch = $this->branchService->hasCurrentBranch()
                ? $this->branchService->current()
                : null;

            try {
                $this->branchService->setCurrentBranch($transfer->fromBranch);

                DB::transaction(function () use ($transfer): void {
                    foreach ($transfer->items as $item) {
                        $this->stockService->adjust(
                            product: $item->product,
                            type: 'in',
                            quantity: $item->quantity,
                            source: 'stock_transfer_cancel',
                            sourceId: $item->id,
                            variant: $item->variant,
                            notes: "Annulation transfert #{$transfer->reference}",
                        );
                    }

                    $transfer->update(['status' => 'cancelled']);
                });
            } finally {
                $previousBranch
                    ? $this->branchService->setCurrentBranch($previousBranch)
                    : $this->branchService->reset();
            }
        } else {
            // draft — annulation sans mouvement de stock
            $transfer->update(['status' => 'cancelled']);
        }

        return $transfer->refresh();
    }

    // ─── Privé ────────────────────────────────────────────────────────────────

    private function generateReference(Tenant $tenant): string
    {
        $year = now()->year;
        $count = StockTransfer::where('tenant_id', $tenant->id)
            ->whereYear('created_at', $year)
            ->count() + 1;

        return sprintf('TRF-%04d-%05d', $year, $count);
    }
}
