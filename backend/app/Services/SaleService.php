<?php

namespace App\Services;

use App\Exceptions\SaleException;
use App\Exceptions\StockInsufficientException;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductLot;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SaleService
{
    // Relations à charger systématiquement pour éviter les N+1 (factures, API)
    private const EAGER_LOAD = [
        'items.product',
        'items.variant',
        'items.lot',
        'payments',
        'customer',
    ];

    public function __construct(
        private readonly TenantService $tenantService,
        private readonly StockService $stockService,
    ) {}

    // ─── API publique ─────────────────────────────────────────────────────────

    /**
     * Crée une vente confirmée de manière totalement atomique.
     *
     * Ordre strict garanti par la transaction :
     *   1. Verrou tenant  → sérialise la génération de référence
     *   2. Verrous stock  → évite les race conditions sur les quantités
     *   3. Validation     → TOUS les stocks vérifiés avant toute écriture
     *   4. Référence      → générée dans la transaction, jamais en doublon
     *   5. Sale           → créée status=confirmed
     *   6. SaleItems      → avec snapshots prix et coût
     *   7. Stock          → décrémenté via StockService (source: 'sale')
     *   8. Payments       → enregistrés
     *
     * @param array{
     *   customer_id?: int|null,
     *   discount_type?: 'percent'|'fixed'|null,
     *   discount_value?: float,
     *   tax_amount?: float,
     *   note?: string|null,
     *   items: array<array{
     *     product_id: int,
     *     variant_id?: int|null,
     *     lot_id?: int|null,
     *     quantity: float,
     *     unit_weight?: float|null,
     *     unit_price: float,
     *     discount?: float,
     *   }>,
     *   payments?: array<array{method: string, amount: float, reference?: string|null}>
     * } $data
     *
     * @throws StockInsufficientException  Stock insuffisant sur au moins un article
     * @throws SaleException               Produit/variante introuvable, lot indisponible
     */
    public function create(array $data, User $seller): Sale
    {
        // Idempotence offline_id — retourne la vente existante sans relancer la transaction
        if (! empty($data['offline_id'])) {
            $existing = Sale::where('tenant_id', $this->tenantService->currentId())
                ->where('offline_id', $data['offline_id'])
                ->first();

            if ($existing) {
                return $existing->load(self::EAGER_LOAD);
            }
        }

        return DB::transaction(function () use ($data, $seller) {
            $tenantId = $this->tenantService->currentId();

            // ── 1. Verrou tenant — sérialise la génération de référence ─────
            // Toute transaction concurrente pour ce tenant bloquera ici,
            // garantissant l'unicité de la séquence VNT-YYYY-XXXXX.
            Tenant::lockForUpdate()->findOrFail($tenantId);

            // ── 2. Verrous stock — tous les produits/variantes en tri par ID ─
            // L'ordre ascendant prévient les deadlocks entre transactions
            // concurrentes qui pourraient verrouiller dans l'ordre inverse.
            [$lockedProducts, $lockedVariants] = $this->lockStockEntities($data['items']);

            // ── 3. Résolution + validation complète avant toute écriture ────
            // Un seul article en rupture → StockInsufficientException + rollback.
            // Les lots sont sélectionnés automatiquement ici (FEFO si has_expiry).
            $resolvedItems = $this->resolveAndValidateItems(
                $data['items'],
                $lockedProducts,
                $lockedVariants,
            );

            // ── 4. Calculs financiers (bcmath — jamais de float natif) ───────
            [$subtotal, $discountAmount, $total] = $this->computeTotals(
                $resolvedItems,
                $data['discount_type'] ?? null,
                (string) ($data['discount_value'] ?? '0'),
                (string) ($data['tax_amount'] ?? '0'),
            );

            // ── 5. Référence unique (dans la transaction, après verrou tenant) ─
            $reference = $this->generateReference($tenantId);

            // ── 6. Création de la vente ──────────────────────────────────────
            $sale = Sale::create([
                'tenant_id'       => $tenantId,
                'customer_id'     => $data['customer_id'] ?? null,
                'user_id'         => $seller->id,
                'reference'       => $reference,
                'offline_id'      => $data['offline_id'] ?? null,
                'subtotal'        => $subtotal,
                'discount_type'   => $data['discount_type'] ?? null,
                'discount_value'  => $data['discount_value'] ?? 0,
                'discount_amount' => $discountAmount,
                'tax_amount'      => $data['tax_amount'] ?? 0,
                'total'           => $total,
                'status'          => 'confirmed',
                'note'            => $data['note'] ?? null,
                'confirmed_at'    => now(),
            ]);

            // ── 7. Lignes de vente — snapshots prix et coût au moment T ─────
            // unit_price : envoyé par le POS (prix affiché à l'écran)
            // cost_price : lu depuis le modèle au moment de la vente
            // Ces valeurs ne doivent JAMAIS être recalculées a posteriori.
            foreach ($resolvedItems as $item) {
                SaleItem::create([
                    'sale_id'     => $sale->id,
                    'product_id'  => $item['product']->id,
                    'variant_id'  => $item['variant']?->id,
                    'lot_id'      => $item['lot']?->id,
                    'quantity'    => $item['quantity'],
                    'unit_weight' => $item['unit_weight'] ?? null,
                    'unit_price'  => $item['unit_price'],
                    'cost_price'  => $item['variant']?->cost_price ?? $item['product']->cost_price,
                    'discount'    => $item['discount'] ?? 0,
                    'total'       => $item['line_total'],
                ]);
            }

            // ── 8. Décréments stock (StockService = seule source de mouvements) ─
            foreach ($resolvedItems as $item) {
                $stockQty = isset($item['unit_weight']) && (float) $item['unit_weight'] > 0
                    ? (float) $item['unit_weight']
                    : (float) $item['quantity'];
                $this->stockService->adjust(
                    product:  $item['product'],
                    type:     'out',
                    quantity: $stockQty,
                    source:   'sale',
                    sourceId: $sale->id,
                    variant:  $item['variant'],
                    lot:      $item['lot'],
                    unitCost: $item['variant']?->cost_price ?? $item['product']->cost_price,
                );
            }

            // ── 9. Paiements ─────────────────────────────────────────────────
            foreach ($data['payments'] ?? [] as $payment) {
                $this->persistPayment($sale, $payment);
            }

            // Eager load complet — évite N+1 dans le contrôleur, la facture PDF, etc.
            $sale->load(self::EAGER_LOAD);

            return $sale;
        });
    }

    /**
     * Annule une vente confirmée et restitue le stock de chaque ligne.
     * Atomique — rollback complet si la restitution d'un article échoue.
     *
     * @throws SaleException  La vente n'est pas dans l'état 'confirmed'
     */
    public function cancel(Sale $sale): Sale
    {
        if (! $sale->isConfirmed()) {
            throw new SaleException(
                "Seules les ventes confirmées peuvent être annulées. Statut actuel : {$sale->status}",
                'INVALID_SALE_STATUS',
            );
        }

        return DB::transaction(function () use ($sale) {
            $sale->load('items');

            foreach ($sale->items as $item) {
                $product = Product::find($item->product_id);
                $variant = $item->variant_id ? ProductVariant::find($item->variant_id) : null;
                $lot     = $item->lot_id ? ProductLot::find($item->lot_id) : null;

                // source_id = sale.id → idempotent si cancel() est appelé deux fois
                $restoreQty = $item->unit_weight && (float) $item->unit_weight > 0
                    ? (float) $item->unit_weight
                    : (float) $item->quantity;
                $this->stockService->adjust(
                    product:  $product,
                    type:     'return',
                    quantity: $restoreQty,
                    source:   'sale_cancel',
                    sourceId: $sale->id,
                    variant:  $variant,
                    lot:      $lot,
                    notes:    "Annulation vente {$sale->reference}",
                );
            }

            $sale->update([
                'status'       => 'cancelled',
                'cancelled_at' => now(),
            ]);

            return $sale->fresh(self::EAGER_LOAD);
        });
    }

    /**
     * Ajoute un paiement à une vente confirmée.
     * Tolérance de 1 CFA pour les arrondis sur les montants XOF.
     *
     * @throws SaleException  La vente n'est pas confirmée, ou le montant dépasse le total
     */
    public function addPayment(
        Sale $sale,
        string $method,
        float $amount,
        ?string $reference = null,
    ): Payment {
        if (! $sale->isConfirmed()) {
            throw new SaleException(
                "Impossible d'ajouter un paiement à une vente {$sale->status}.",
                'INVALID_SALE_STATUS',
            );
        }

        // Tolérance 1 CFA — arrondis fréquents sur les montants XOF sans centimes
        $alreadyPaid = (string) $sale->payments()->sum('amount');
        $newTotal    = bcadd($alreadyPaid, (string) $amount, 2);
        $maxAllowed  = bcadd((string) $sale->total, '1.00', 2);

        if (bccomp($newTotal, $maxAllowed, 2) > 0) {
            throw new SaleException(
                "Le paiement de {$amount} dépasserait le total ({$sale->total}). Déjà encaissé : {$alreadyPaid}.",
                'PAYMENT_EXCEEDS_TOTAL',
            );
        }

        return Payment::create([
            'tenant_id' => $sale->tenant_id,
            'sale_id'   => $sale->id,
            'method'    => $method,
            'amount'    => $amount,
            'reference' => $reference,
            'paid_at'   => now(),
        ]);
    }

    // ─── Méthodes privées ─────────────────────────────────────────────────────

    /**
     * Charge et verrouille tous les produits et variantes d'une commande
     * en ordre ID ascendant — prévient les deadlocks entre transactions
     * concurrentes qui pourraient acquérir les mêmes verrous en ordre inverse.
     *
     * @return array{0: Collection, 1: Collection}
     */
    private function lockStockEntities(array $items): array
    {
        $productIds = collect($items)
            ->pluck('product_id')->unique()->sort()->values()->all();

        $variantIds = collect($items)
            ->filter(fn($i) => ! empty($i['variant_id']))
            ->pluck('variant_id')->unique()->sort()->values()->all();

        $lockedProducts = Product::lockForUpdate()
            ->whereIn('id', $productIds)
            ->get()
            ->keyBy('id');

        $lockedVariants = ! empty($variantIds)
            ? ProductVariant::lockForUpdate()
                ->whereIn('id', $variantIds)
                ->get()
                ->keyBy('id')
            : collect();

        return [$lockedProducts, $lockedVariants];
    }

    /**
     * Trois passes sur les items :
     *   1. Résolution produit/variante + calcul total ligne
     *   2. Agrégation des besoins stock par entité + validation groupée
     *      (gère le cas où le même produit apparaît sur plusieurs lignes)
     *   3. Sélection des lots (FEFO si has_expiry, verrouillés FOR UPDATE)
     *
     * @throws StockInsufficientException
     * @throws SaleException
     */
    private function resolveAndValidateItems(
        array $items,
        Collection $lockedProducts,
        Collection $lockedVariants,
    ): array {
        // ── Passe 1 : résolution + calcul ligne ──────────────────────────────
        $resolved = [];

        foreach ($items as $item) {
            $product = $lockedProducts->get($item['product_id'])
                ?? throw new SaleException(
                    "Produit #{$item['product_id']} introuvable.",
                    'PRODUCT_NOT_FOUND',
                );

            $variant = ! empty($item['variant_id'])
                ? ($lockedVariants->get($item['variant_id'])
                    ?? throw new SaleException(
                        "Variante #{$item['variant_id']} introuvable.",
                        'VARIANT_NOT_FOUND',
                    ))
                : null;

            // Total ligne : produit au poids → unit_price × unit_weight, sinon × quantity
            $multiplier = isset($item['unit_weight']) && (float) $item['unit_weight'] > 0
                ? (string) $item['unit_weight']
                : (string) $item['quantity'];
            $lineTotal = bcmul((string) $item['unit_price'], $multiplier, 2);
            $lineTotal = bcsub($lineTotal, (string) ($item['discount'] ?? '0'), 2);

            $resolved[] = [
                ...$item,
                'product'    => $product,
                'variant'    => $variant,
                'lot'        => null,  // assigné en passe 3
                'line_total' => $lineTotal,
            ];
        }

        // ── Passe 2 : agrégation + validation stock ───────────────────────────
        // Agrège les quantités par entité de stock avant de valider.
        // Ex: 2 lignes pour le même produit → stock vérifié sur la somme.
        $stockNeeds = [];

        foreach ($resolved as $item) {
            $key = $item['variant']
                ? "v:{$item['variant']->id}"
                : "p:{$item['product']->id}";

            // Quantité à déduire : unit_weight pour produits au poids, quantity sinon
            $qtyNeeded = isset($item['unit_weight']) && (float) $item['unit_weight'] > 0
                ? (string) $item['unit_weight']
                : (string) $item['quantity'];
            $stockNeeds[$key] = bcadd($stockNeeds[$key] ?? '0', $qtyNeeded, 3);
        }

        $validated = [];

        foreach ($resolved as $item) {
            $key = $item['variant']
                ? "v:{$item['variant']->id}"
                : "p:{$item['product']->id}";

            if (isset($validated[$key])) {
                continue; // déjà validé pour cette entité
            }
            $validated[$key] = true;

            $stockOwner = $item['variant'] ?? $item['product'];
            $available  = (string) $stockOwner->stock_quantity;
            $needed     = $stockNeeds[$key];

            if (bccomp($needed, $available, 3) > 0) {
                throw new StockInsufficientException(
                    product:   $item['product'],
                    variant:   $item['variant'],
                    requested: (float) $needed,
                    available: (float) $available,
                );
            }
        }

        // ── Passe 3 : sélection des lots (FEFO, verrouillés) ─────────────────
        foreach ($resolved as &$item) {
            $item['lot'] = ! empty($item['lot_id'])
                ? ProductLot::lockForUpdate()->find($item['lot_id'])
                : $this->selectLot($item['product'], $item['variant'], (float) $item['quantity']);
        }
        unset($item); // nettoyage référence foreach

        return $resolved;
    }

    /**
     * Tous les calculs financiers via bcmath.
     * Les montants XOF sont des entiers — bcmath évite les erreurs
     * d'arrondi des floats natifs sur les multiplications/divisions.
     *
     * @return array{0: string, 1: string, 2: string} [subtotal, discountAmount, total]
     */
    private function computeTotals(
        array $resolvedItems,
        ?string $discountType,
        string $discountValue,
        string $taxAmount,
    ): array {
        $subtotal = '0.00';
        foreach ($resolvedItems as $item) {
            $subtotal = bcadd($subtotal, $item['line_total'], 2);
        }

        $discountAmount = match ($discountType) {
            'percent' => bcmul($subtotal, bcdiv($discountValue, '100', 6), 2),
            'fixed'   => $discountValue,
            default   => '0.00',
        };

        $total = bcsub($subtotal, $discountAmount, 2);
        $total = bcadd($total, $taxAmount, 2);

        return [$subtotal, $discountAmount, $total];
    }

    /**
     * Génère la prochaine référence unique pour ce tenant et cette année.
     *
     * Format : VNT-2026-00001
     *
     * Sécurité : appelée APRÈS le lockForUpdate() sur Tenant → toutes les
     * transactions concurrentes pour ce tenant sérialisent ici.
     * Aucun doublon possible, même sous charge parallèle.
     */
    private function generateReference(int $tenantId): string
    {
        $year   = now()->format('Y');
        $prefix = "VNT-{$year}-";

        $last = Sale::where('tenant_id', $tenantId)
            ->where('reference', 'like', "{$prefix}%")
            ->max('reference');

        // Extrait les 5 derniers caractères numériques : "VNT-2026-00042" → 42
        $seq = $last ? ((int) substr($last, -5)) + 1 : 1;

        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Sélectionne automatiquement le lot disponible selon la stratégie FEFO
     * (First Expiry First Out) — lot le plus proche de l'expiration en premier.
     *
     * Le verrou FOR UPDATE empêche deux transactions de sélectionner le même lot.
     * Retourne null si le produit ne gère pas les lots (has_expiry = false).
     *
     * @throws SaleException  Aucun lot avec quantité suffisante et non expiré
     */
    private function selectLot(Product $product, ?ProductVariant $variant, float $qty): ?ProductLot
    {
        if (! $product->has_expiry) {
            return null;
        }

        $lot = ProductLot::lockForUpdate()
            ->where('product_id', $product->id)
            ->when($variant, fn($q) => $q->where('product_variant_id', $variant->id))
            ->where('is_active', true)
            ->where('quantity_remaining', '>=', $qty)
            ->where('expiry_date', '>', now()->toDateString()) // non expiré
            ->orderBy('expiry_date', 'asc')                    // FEFO
            ->first();

        if (! $lot) {
            $label = $variant
                ? "{$product->name} ({$variant->attribute_summary})"
                : $product->name;

            throw new SaleException(
                "Aucun lot disponible avec {$qty} unité(s) pour « {$label} ».",
                'LOT_UNAVAILABLE',
            );
        }

        return $lot;
    }

    private function persistPayment(Sale $sale, array $payment): void
    {
        Payment::create([
            'tenant_id' => $sale->tenant_id,
            'sale_id'   => $sale->id,
            'method'    => $payment['method'],
            'amount'    => $payment['amount'],
            'reference' => $payment['reference'] ?? null,
            'paid_at'   => $payment['paid_at'] ?? now(),
        ]);
    }
}
