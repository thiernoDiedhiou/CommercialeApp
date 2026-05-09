<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductLot;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Tenant;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use LogicException;

class PurchaseService
{
    public function __construct(
        private readonly TenantService $tenantService,
        private readonly StockService $stockService,
    ) {}

    // ─── API publique ─────────────────────────────────────────────────────────

    /**
     * Crée un bon de commande en statut 'draft'.
     *
     * @param array{
     *   supplier_id?: int|null,
     *   expected_at?: string|null,
     *   notes?: string|null,
     *   items: array<array{
     *     product_id: int,
     *     product_variant_id?: int|null,
     *     quantity_ordered: float,
     *     unit_cost: float,
     *   }>
     * } $data
     */
    public function create(array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($data) {
            $tenantId = $this->tenantService->currentId();

            // Verrou tenant — sérialise la génération de référence (même pattern que SaleService)
            Tenant::lockForUpdate()->findOrFail($tenantId);

            $reference = $this->generateReference($tenantId);

            $order = PurchaseOrder::create([
                'tenant_id'   => $tenantId,
                'supplier_id' => $data['supplier_id'] ?? null,
                'user_id'     => Auth::id(),
                'reference'   => $reference,
                'status'      => PurchaseOrder::STATUS_DRAFT,
                'expected_at' => $data['expected_at'] ?? null,
                'notes'       => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                PurchaseOrderItem::create([
                    'purchase_order_id'  => $order->id,
                    'product_id'         => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'quantity_ordered'   => $item['quantity_ordered'],
                    'quantity_received'  => 0,
                    'unit_cost'          => $item['unit_cost'],
                ]);
            }

            return $order->load(['supplier', 'user', 'items.product', 'items.variant']);
        });
    }

    /**
     * Passe le bon en statut 'ordered' (envoyé au fournisseur).
     *
     * @throws LogicException  Statut actuel != draft
     */
    public function confirm(PurchaseOrder $order): PurchaseOrder
    {
        if (! $order->isDraft()) {
            throw new LogicException(
                "Seuls les bons en statut 'draft' peuvent être confirmés. Statut actuel : {$order->status}"
            );
        }

        $order->update(['status' => PurchaseOrder::STATUS_ORDERED]);

        return $order->fresh();
    }

    /**
     * Réceptionne tout ou partie des articles d'un bon de commande.
     * Crée un mouvement de stock 'in' pour chaque ligne reçue.
     *
     * Ordre garanti :
     *   1. Validation des quantités (reliquat non dépassé)
     *   2. Entrée en stock via StockService
     *   3. Mise à jour de quantity_received sur chaque ligne
     *   4. Mise à jour du statut (partial → received si tout livré)
     *
     * @param array<array{id: int, quantity_received: float}> $receptions
     *
     * @throws LogicException  Bon non réceptionnable, quantité invalide
     */
    public function receive(PurchaseOrder $order, array $receptions): PurchaseOrder
    {
        if (! $order->isReceivable()) {
            throw new LogicException(
                "Le bon #{$order->reference} ne peut pas être réceptionné (statut : {$order->status})."
            );
        }

        return DB::transaction(function () use ($order, $receptions) {
            $order->load('items');

            $itemsById = $order->items->keyBy('id');

            foreach ($receptions as $reception) {
                $item = $itemsById->get($reception['id'])
                    ?? throw new LogicException("Ligne #{$reception['id']} introuvable sur ce bon.");

                $qty = (float) $reception['quantity_received'];

                if ($qty <= 0) {
                    continue;
                }

                // On ne peut pas recevoir plus que le reliquat
                $remaining = (float) $item->remainingToReceive();
                if (bccomp((string) $qty, (string) $remaining, 3) > 0) {
                    throw new LogicException(
                        "Quantité reçue ({$qty}) supérieure au reliquat ({$remaining}) pour la ligne #{$item->id}."
                    );
                }

                $product = Product::findOrFail($item->product_id);
                $variant = $item->product_variant_id
                    ? ProductVariant::find($item->product_variant_id)
                    : null;

                // sourceId composite : identifie de manière unique cet événement de réception.
                // Format : item_id + quantity_received avant cet appel + quantité reçue.
                // Si la transaction échoue après adjust() mais avant increment(), un retry
                // produit le même sourceId → StockService retourne le mouvement existant.
                $sourceId = abs(crc32("purchase:{$item->id}:{$item->quantity_received}:{$qty}"));

                $lot = null;
                if ($product->has_expiry && ! empty($reception['lot_number'])) {
                    $lot = $this->findOrCreateLot(
                        product:    $product,
                        variant:    $variant,
                        lotNumber:  $reception['lot_number'],
                        expiryDate: $reception['expiry_date'] ?? null,
                        qty:        (int) $qty,
                        unitCost:   (float) $item->unit_cost,
                    );
                }

                $this->stockService->adjust(
                    product:  $product,
                    type:     'in',
                    quantity: $qty,
                    source:   'purchase',
                    sourceId: $sourceId,
                    variant:  $variant,
                    unitCost: (float) $item->unit_cost,
                    notes:    "Réception {$order->reference}",
                    lot:      $lot,
                );

                $item->increment('quantity_received', $qty);
            }

            // Statut global : received si tout livré, partial sinon
            $order->refresh()->load('items');
            $allReceived = $order->items->every(fn ($i) => $i->isFullyReceived());

            $order->update([
                'status'      => $allReceived ? PurchaseOrder::STATUS_RECEIVED : PurchaseOrder::STATUS_PARTIAL,
                'received_at' => $allReceived ? now() : $order->received_at,
            ]);

            return $order->fresh(['supplier', 'user', 'items.product', 'items.variant']);
        });
    }

    /**
     * Annule un bon draft ou ordered.
     * Pas de mouvement de stock — le stock n'a pas encore été crédité.
     *
     * @throws LogicException  Bon non annulable (partial/received/cancelled)
     */
    public function cancel(PurchaseOrder $order): PurchaseOrder
    {
        if (! $order->isCancellable()) {
            throw new LogicException(
                "Le bon #{$order->reference} ne peut pas être annulé (statut : {$order->status})."
            );
        }

        $order->update(['status' => PurchaseOrder::STATUS_CANCELLED]);

        return $order->fresh();
    }

    // ─── Lots ─────────────────────────────────────────────────────────────────

    private function findOrCreateLot(
        Product        $product,
        ?ProductVariant $variant,
        string         $lotNumber,
        ?string        $expiryDate,
        int            $qty,
        float          $unitCost,
    ): ProductLot {
        $existing = ProductLot::where('tenant_id', $this->tenantService->currentId())
            ->where('product_id', $product->id)
            ->where('product_variant_id', $variant?->id)
            ->where('lot_number', $lotNumber)
            ->first();

        if ($existing) {
            // Seul quantity_received est incrémenté manuellement.
            // quantity_remaining sera incrémenté par StockService::updateLotQuantity()
            $existing->increment('quantity_received', $qty);

            return $existing;
        }

        return ProductLot::create([
            'tenant_id'          => $this->tenantService->currentId(),
            'product_id'         => $product->id,
            'product_variant_id' => $variant?->id,
            'lot_number'         => $lotNumber,
            'expiry_date'        => $expiryDate,
            'quantity_received'  => $qty,
            'quantity_remaining' => 0, // StockService::adjust() incrémentera via updateLotQuantity()
            'purchase_price'     => $unitCost,
            'is_active'          => true,
        ]);
    }

    // ─── Référence ────────────────────────────────────────────────────────────

    /**
     * Génère la prochaine référence ACH-YYYY-XXXXX.
     * Appelée après lockForUpdate() sur Tenant → unicité garantie.
     */
    private function generateReference(int $tenantId): string
    {
        $year   = now()->format('Y');
        $prefix = "ACH-{$year}-";

        $last = PurchaseOrder::where('tenant_id', $tenantId)
            ->where('reference', 'like', "{$prefix}%")
            ->max('reference');

        $seq = $last ? ((int) substr($last, -5)) + 1 : 1;

        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }
}
