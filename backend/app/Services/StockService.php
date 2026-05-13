<?php

namespace App\Services;

use App\Exceptions\StockInsufficientException;
use App\Jobs\SendStockAlertJob;
use App\Models\Product;
use App\Models\ProductLot;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StockService
{
    private const VALID_TYPES  = ['in', 'out', 'adjustment', 'return'];
    private const OUTBOUND_TYPES = ['out'];

    public function __construct(private readonly TenantService $tenantService) {}

    // ─── API publique ─────────────────────────────────────────────────────────

    /**
     * Crée un mouvement de stock de manière atomique et idempotente.
     *
     * - Pour 'in' | 'out' | 'return' : quantity doit être > 0
     * - Pour 'adjustment'            : quantity est un delta signé (+ ou -)
     *
     * @throws StockInsufficientException  Stock insuffisant pour une sortie
     * @throws InvalidArgumentException    Type invalide ou quantity ≤ 0 pour in/out/return
     */
    public function adjust(
        Product $product,
        string $type,
        float $quantity,
        string $source,
        ?int $sourceId = null,
        ?ProductVariant $variant = null,
        ?ProductLot $lot = null,
        ?float $unitCost = null,
        ?string $notes = null,
    ): StockMovement {
        $this->validateAdjustInput($type, $quantity);

        // Idempotence — si le mouvement existe déjà (retour offline, double envoi)
        // on retourne l'existant sans créer de doublon
        if ($sourceId !== null) {
            $existing = $this->findExistingMovement($source, $sourceId, $product, $variant);
            if ($existing) {
                return $existing;
            }
        }

        $movement = DB::transaction(function () use (
            $product, $type, $quantity, $source, $sourceId,
            $variant, $lot, $unitCost, $notes
        ) {
            // ── 1. Verrouillage pessimiste ──────────────────────────────────
            // SELECT FOR UPDATE : bloque les écritures concurrentes sur la ligne.
            // Garantit que stock_before est cohérent même sous charge parallèle.
            if ($variant) {
                $locked = ProductVariant::lockForUpdate()->findOrFail($variant->id);
            } else {
                $locked = Product::lockForUpdate()->findOrFail($product->id);
            }

            // ── 2. stock_before depuis le dernier mouvement ─────────────────
            // Le dernier stock_after est la source de vérité canonique.
            // stock_quantity (dénormalisé) est toujours maintenu en sync par
            // ce service ; on l'utilise en fallback si aucun mouvement n'existe.
            $lastMovement = $this->getLastMovement($product, $variant);
            $stockBefore  = $lastMovement
                ? $lastMovement->stock_after
                : (float) $locked->stock_quantity;

            // ── 3. stock_after ──────────────────────────────────────────────
            $stockAfter = $this->computeStockAfter($stockBefore, $type, $quantity);

            // ── 4. Vérification stock suffisant ────────────────────────────
            if (in_array($type, self::OUTBOUND_TYPES, true) && $stockAfter < 0) {
                throw new StockInsufficientException(
                    product: $product,
                    variant: $variant,
                    requested: $quantity,
                    available: $stockBefore,
                );
            }

            // ── 5. Création du mouvement (append-only) ──────────────────────
            $movement = StockMovement::create([
                'tenant_id'          => $this->tenantService->currentId(),
                'product_id'         => $product->id,
                'product_variant_id' => $variant?->id,
                'lot_id'             => $lot?->id,
                'type'               => $type,
                'quantity'           => abs($quantity),  // toujours positif en base
                'stock_before'       => $stockBefore,
                'stock_after'        => $stockAfter,
                'source'             => $source,
                'source_id'          => $sourceId,
                'unit_cost'          => $unitCost,
                'user_id'            => Auth::id(),
                'notes'              => $notes,
            ]);

            // ── 6. Mise à jour du stock dénormalisé ─────────────────────────
            // Cache rapide pour lectures POS — toujours en sync avec le journal
            $locked->update(['stock_quantity' => $stockAfter]);

            // Sync de l'objet en mémoire pour l'appelant
            if ($variant) {
                $variant->stock_quantity = $stockAfter;
            } else {
                $product->stock_quantity = $stockAfter;
            }

            // ── 7. Mise à jour du lot si applicable ─────────────────────────
            if ($lot !== null) {
                $this->updateLotQuantity($lot, $type, $quantity);
            }

            return $movement;
        });

        // Alerte stock bas — dispatch hors transaction pour éviter les effets de bord
        $this->dispatchStockAlertIfNeeded($movement, $product, $variant, $type, $quantity);

        return $movement;
    }

    /**
     * Retourne le stock actuel d'un produit ou d'une variante.
     * Lecture depuis la colonne dénormalisée (mise à jour atomique par adjust()).
     */
    public function getCurrentStock(Product $product, ?ProductVariant $variant = null): float
    {
        if ($variant) {
            return (float) ProductVariant::query()
                ->where('id', $variant->id)
                ->value('stock_quantity') ?? 0.0;
        }

        return (float) Product::query()
            ->where('id', $product->id)
            ->value('stock_quantity') ?? 0.0;
    }

    /**
     * Recalcule le stock depuis l'historique complet des mouvements.
     * Usage : vérification d'intégrité, réparation de données.
     * NE PAS appeler sur le chemin critique (lent sur long historique).
     */
    public function recomputeFromHistory(Product $product, ?ProductVariant $variant = null): float
    {
        $lastMovement = $this->getLastMovement($product, $variant);

        return $lastMovement?->stock_after ?? 0.0;
    }

    // ─── Méthodes privées ─────────────────────────────────────────────────────

    private function computeStockAfter(float $stockBefore, string $type, float $quantity): float
    {
        return match ($type) {
            'in'         => $stockBefore + $quantity,
            'out'        => $stockBefore - $quantity,
            'return'     => $stockBefore + $quantity,
            // adjustment : quantity est un delta signé (peut être négatif)
            'adjustment' => $stockBefore + $quantity,
        };
    }

    private function getLastMovement(Product $product, ?ProductVariant $variant): ?StockMovement
    {
        return StockMovement::where('product_id', $product->id)
            ->when(
                $variant,
                fn($q) => $q->where('product_variant_id', $variant->id),
                fn($q) => $q->whereNull('product_variant_id'),
            )
            ->latest('id')
            ->first();
    }

    private function findExistingMovement(
        string $source,
        int $sourceId,
        Product $product,
        ?ProductVariant $variant,
    ): ?StockMovement {
        return StockMovement::where('source', $source)
            ->where('source_id', $sourceId)
            ->where('product_id', $product->id)
            ->when(
                $variant,
                fn($q) => $q->where('product_variant_id', $variant->id),
                fn($q) => $q->whereNull('product_variant_id'),
            )
            ->first();
    }

    private function updateLotQuantity(ProductLot $lot, string $type, float $quantity): void
    {
        match ($type) {
            'in'     => $lot->increment('quantity_remaining', abs($quantity)),
            'out'    => $lot->decrement('quantity_remaining', abs($quantity)),
            'return' => $lot->increment('quantity_remaining', abs($quantity)),
            default  => null,  // adjustment : le lot n'est pas impacté automatiquement
        };
    }

    private function dispatchStockAlertIfNeeded(
        StockMovement $movement,
        Product $product,
        ?ProductVariant $variant,
        string $type,
        float $quantity,
    ): void {
        // Seuls les mouvements sortants peuvent déclencher une alerte
        $isOutbound = $type === 'out' || ($type === 'adjustment' && $quantity < 0);
        if (! $isOutbound) {
            return;
        }

        $threshold = (int) ($variant?->alert_threshold ?? $product->alert_threshold ?? 0);
        $wasAbove  = $movement->stock_before > $threshold;
        $isBelow   = $movement->stock_after  <= $threshold;

        if ($wasAbove && $isBelow && $this->tenantService->hasCurrentTenant()) {
            SendStockAlertJob::dispatchSync(
                $this->tenantService->current(),
                $product,
                $variant,
            );
        }
    }

    private function validateAdjustInput(string $type, float $quantity): void
    {
        if (! in_array($type, self::VALID_TYPES, true)) {
            throw new InvalidArgumentException(
                "Type de mouvement invalide : '{$type}'. Valeurs acceptées : "
                . implode(', ', self::VALID_TYPES)
            );
        }

        // Pour in/out/return, la quantité doit être strictement positive
        if ($type !== 'adjustment' && $quantity <= 0) {
            throw new InvalidArgumentException(
                "La quantité doit être strictement positive pour le type '{$type}'."
            );
        }
    }
}
