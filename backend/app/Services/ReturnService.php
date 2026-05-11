<?php

namespace App\Services;

use App\Exceptions\SaleException;
use App\Models\Product;
use App\Models\ProductLot;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReturnService
{
    private const EAGER_LOAD = [
        'items.product',
        'items.variant',
        'items.lot',
        'sale',
        'user',
    ];

    public function __construct(
        private readonly TenantService $tenantService,
        private readonly StockService $stockService,
    ) {}

    /**
     * Crée un retour partiel ou total pour une vente confirmée.
     *
     * Garanties :
     *   - La vente doit être confirmée (pas draft, pas annulée)
     *   - Chaque quantité retournée ≤ quantité vendable restante (soldée − déjà retournée)
     *   - Le stock est restitué atomiquement via StockService (source 'sale_return')
     *   - La référence RET-YYYY-XXXXX est unique dans la transaction
     *
     * @param array{
     *   reason?: string|null,
     *   refund_method: 'cash'|'credit'|'none',
     *   items: array<array{sale_item_id: int, quantity: float}>
     * } $data
     *
     * @throws SaleException  Vente non confirmée, article hors périmètre, qté excédentaire
     */
    public function create(Sale $sale, array $data, User $user): SaleReturn
    {
        if (! $sale->isConfirmed()) {
            throw new SaleException(
                "Seules les ventes confirmées peuvent faire l'objet d'un retour. Statut : {$sale->status}",
                'INVALID_SALE_STATUS',
            );
        }

        return DB::transaction(function () use ($sale, $data, $user) {
            $tenantId = $this->tenantService->currentId();

            // Verrou tenant pour sérialiser la génération de référence
            Tenant::lockForUpdate()->findOrFail($tenantId);

            // Charger les items de la vente + quantités déjà retournées
            $saleItems = SaleItem::where('sale_id', $sale->id)
                ->with(['product', 'variant', 'lot'])
                ->get()
                ->keyBy('id');

            // Quantités déjà retournées par sale_item_id
            $alreadyReturned = SaleReturnItem::whereIn('sale_item_id', $saleItems->keys())
                ->selectRaw('sale_item_id, SUM(quantity) as qty_returned')
                ->groupBy('sale_item_id')
                ->pluck('qty_returned', 'sale_item_id')
                ->map(fn($v) => (string) $v);

            // Valider et résoudre chaque ligne de retour
            $resolvedItems = $this->resolveReturnItems(
                $data['items'],
                $saleItems,
                $alreadyReturned,
            );

            // Calcul total retour
            $total = '0.00';
            foreach ($resolvedItems as $item) {
                $total = bcadd($total, $item['line_total'], 2);
            }

            // Référence unique RET-YYYY-XXXXX
            $reference = $this->generateReference($tenantId);

            // Création du retour
            $saleReturn = SaleReturn::create([
                'tenant_id'     => $tenantId,
                'sale_id'       => $sale->id,
                'user_id'       => $user->id,
                'reference'     => $reference,
                'reason'        => $data['reason'] ?? null,
                'refund_method' => $data['refund_method'],
                'total'         => $total,
            ]);

            // Lignes de retour + restitution stock
            foreach ($resolvedItems as $item) {
                $returnItem = SaleReturnItem::create([
                    'sale_return_id'     => $saleReturn->id,
                    'sale_item_id'       => $item['sale_item']->id,
                    'product_id'         => $item['sale_item']->product_id,
                    'product_variant_id' => $item['sale_item']->variant_id,
                    'lot_id'             => $item['sale_item']->lot_id,
                    'quantity'           => $item['quantity'],
                    'unit_weight'        => $item['unit_weight'],
                    'unit_price'         => $item['sale_item']->unit_price,
                    'total'              => $item['line_total'],
                ]);

                // Restitution stock (source 'sale_return', idempotent par returnItem.id)
                $this->stockService->adjust(
                    product:  $item['product'],
                    type:     'return',
                    quantity: $item['stock_qty'],
                    source:   'sale_return',
                    sourceId: $returnItem->id,
                    variant:  $item['variant'],
                    lot:      $item['lot'],
                    notes:    "Retour {$reference} — vente {$sale->reference}",
                );
            }

            return $saleReturn->load(self::EAGER_LOAD);
        });
    }

    // ─── Méthodes privées ─────────────────────────────────────────────────────

    /**
     * @throws SaleException  Article inconnu, ou quantité retournée > quantité disponible
     */
    private function resolveReturnItems(
        array $requestedItems,
        \Illuminate\Support\Collection $saleItems,
        \Illuminate\Support\Collection $alreadyReturned,
    ): array {
        $resolved = [];

        foreach ($requestedItems as $item) {
            $saleItemId = $item['sale_item_id'];
            $saleItem   = $saleItems->get($saleItemId)
                ?? throw new SaleException(
                    "L'article #{$saleItemId} n'appartient pas à cette vente.",
                    'ITEM_NOT_IN_SALE',
                );

            // Quantité originale vendue (poids ou unité)
            $originalQty = $saleItem->unit_weight
                ? (float) $saleItem->unit_weight
                : (float) $saleItem->quantity;

            // Quantité déjà retournée pour cet item
            $returnedSoFar = (float) ($alreadyReturned->get($saleItemId) ?? '0');

            // Quantité retournable restante
            $returnable = bcsub((string) $originalQty, (string) $returnedSoFar, 3);

            $requestedQty = (string) $item['quantity'];

            if (bccomp($requestedQty, '0', 3) <= 0) {
                throw new SaleException(
                    "La quantité à retourner doit être supérieure à 0 (article #{$saleItemId}).",
                    'INVALID_RETURN_QUANTITY',
                );
            }

            if (bccomp($requestedQty, $returnable, 3) > 0) {
                $label = $saleItem->product?->name ?? "Article #{$saleItemId}";
                throw new SaleException(
                    "Impossible de retourner {$requestedQty} unité(s) de « {$label} » — retournable : {$returnable}.",
                    'RETURN_EXCEEDS_SOLD',
                );
            }

            // Quantité à restituer au stock
            $stockQty = (float) $requestedQty;

            // Total ligne : unit_price × quantité retournée
            $lineTotal = bcmul((string) $saleItem->unit_price, $requestedQty, 2);

            $product = $saleItem->product ?? Product::find($saleItem->product_id);
            $variant = $saleItem->variant_id
                ? ($saleItem->variant ?? ProductVariant::find($saleItem->variant_id))
                : null;
            $lot = $saleItem->lot_id
                ? ($saleItem->lot ?? ProductLot::find($saleItem->lot_id))
                : null;

            $resolved[] = [
                'sale_item'  => $saleItem,
                'product'    => $product,
                'variant'    => $variant,
                'lot'        => $lot,
                // quantity = montant réel retourné (kg pour poids, pièces sinon)
                // garantit que SUM(quantity) fonctionne pour tous les types d'articles
                'quantity'   => $requestedQty,
                'unit_weight'=> $saleItem->unit_weight ? $requestedQty : null,
                'stock_qty'  => $stockQty,
                'line_total' => $lineTotal,
            ];
        }

        return $resolved;
    }

    private function generateReference(int $tenantId): string
    {
        $year   = now()->format('Y');
        $prefix = "RET-{$year}-";

        $last = SaleReturn::where('tenant_id', $tenantId)
            ->where('reference', 'like', "{$prefix}%")
            ->max('reference');

        $seq = $last ? ((int) substr($last, -5)) + 1 : 1;

        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }
}
