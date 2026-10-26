<?php

namespace App\Services;

use App\Exceptions\StockInsufficientException;
use App\Jobs\SendStockAlertJob;
use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Product;
use App\Models\ProductLot;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StockService
{
    private const VALID_TYPES = ['in', 'out', 'adjustment', 'return'];

    private const OUTBOUND_TYPES = ['out'];

    public function __construct(
        private readonly TenantService $tenantService,
        private readonly BranchService $branchService,
    ) {}

    // ─── API publique ─────────────────────────────────────────────────────────

    /**
     * Crée un mouvement de stock de manière atomique et idempotente.
     *
     * Model B — per-branch stock :
     *   - Lit et verrouille branch_stocks pour la succursale courante
     *   - Met à jour branch_stocks après le mouvement
     *   - Recalcule stock_quantity = SUM(branch_stocks) — dénormalisé global
     *
     * @throws StockInsufficientException Stock insuffisant pour une sortie
     * @throws InvalidArgumentException Type invalide ou quantity ≤ 0 pour in/out/return
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
            $branchId = $this->resolveBranchId();
            $variantKey = $variant ? $variant->id : 0;

            // ── 1. Verrou produit/variante — sérialise la mise à jour du global ─
            // Garantit que stock_quantity = SUM(branch_stocks) est cohérent
            // même quand deux succursales ajustent simultanément le même produit.
            if ($variant) {
                $locked = ProductVariant::lockForUpdate()->findOrFail($variant->id);
            } else {
                $locked = Product::lockForUpdate()->findOrFail($product->id);
            }

            // ── 2. Verrou branch_stocks — source de vérité per-branch ──────────
            if ($branchId !== null) {
                $branchStock = BranchStock::where('branch_id', $branchId)
                    ->where('product_id', $product->id)
                    ->where('product_variant_id', $variantKey)
                    ->lockForUpdate()
                    ->first();

                if ($branchStock !== null) {
                    $stockBefore = (float) $branchStock->quantity;
                } else {
                    // Pas de ligne branch_stocks pour cette succursale/produit.
                    // Si aucune ligne n'existe pour ce produit (nouveau produit créé après migration),
                    // on bootstrappe depuis stock_quantity global.
                    // Si des lignes existent pour d'autres succursales, cette succursale commence à 0.
                    $hasAnyBranchRow = BranchStock::where('product_id', $product->id)
                        ->where('product_variant_id', $variantKey)
                        ->exists();

                    $stockBefore = $hasAnyBranchRow ? 0.0 : (float) $locked->stock_quantity;
                }
            } else {
                // Pas de contexte succursale (Artisan, seeders hors-tenant)
                $branchStock = null;
                $stockBefore = (float) $locked->stock_quantity;
            }

            // ── 3. stock_after ──────────────────────────────────────────────────
            $stockAfter = $this->computeStockAfter($stockBefore, $type, $quantity);

            // ── 4. Vérification stock suffisant ────────────────────────────────
            if (in_array($type, self::OUTBOUND_TYPES, true) && $stockAfter < 0) {
                throw new StockInsufficientException(
                    product: $product,
                    variant: $variant,
                    requested: $quantity,
                    available: $stockBefore,
                );
            }

            // ── 5. Création du mouvement (append-only) ──────────────────────────
            $movement = StockMovement::create([
                'tenant_id' => $this->tenantService->currentId(),
                'branch_id' => $branchId,
                'product_id' => $product->id,
                'product_variant_id' => $variant?->id,
                'lot_id' => $lot?->id,
                'type' => $type,
                'quantity' => abs($quantity),
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'source' => $source,
                'source_id' => $sourceId,
                'unit_cost' => $unitCost,
                'user_id' => Auth::id(),
                'notes' => $notes,
            ]);

            // ── 6. Mise à jour branch_stocks ────────────────────────────────────
            if ($branchId !== null) {
                if ($branchStock) {
                    BranchStock::where('id', $branchStock->id)
                        ->update(['quantity' => $stockAfter, 'updated_at' => now()]);
                } else {
                    BranchStock::create([
                        'tenant_id' => $this->tenantService->currentId(),
                        'branch_id' => $branchId,
                        'product_id' => $product->id,
                        'product_variant_id' => $variantKey,
                        'quantity' => $stockAfter,
                    ]);
                }
            }

            // ── 7. Mise à jour stock_quantity global = SUM(branch_stocks) ───────
            // Cache dénormalisé pour les requêtes POS globales et les rapports.
            $globalStock = $branchId !== null
                ? (float) BranchStock::where('product_id', $product->id)
                    ->where('product_variant_id', $variantKey)
                    ->sum('quantity')
                : $stockAfter;

            $locked->update(['stock_quantity' => $globalStock]);

            // Sync de l'objet en mémoire pour l'appelant
            if ($variant) {
                $variant->stock_quantity = $globalStock;
            } else {
                $product->stock_quantity = $globalStock;
            }

            // ── 8. Mise à jour du lot si applicable ─────────────────────────────
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
     * Stock de la succursale courante pour un produit/variante donné.
     * Retourne la valeur depuis branch_stocks si un contexte succursale existe,
     * sinon la valeur dénormalisée globale (stock_quantity).
     */
    public function getCurrentStock(Product $product, ?ProductVariant $variant = null): float
    {
        $branchId = $this->branchService->currentId();

        if ($branchId !== null) {
            $variantKey = $variant ? $variant->id : 0;

            return (float) BranchStock::where('branch_id', $branchId)
                ->where('product_id', $product->id)
                ->where('product_variant_id', $variantKey)
                ->value('quantity') ?? 0.0;
        }

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
     * Retourne le stock de toutes les succursales pour un produit/variante.
     * Utilisé par StockController pour afficher l'inventaire par succursale.
     *
     * @return array<int, array{branch_id: int, branch_name: string, quantity: float}>
     */
    public function getStockByBranch(Product $product, ?ProductVariant $variant = null): array
    {
        $variantKey = $variant ? $variant->id : 0;

        return BranchStock::with('branch:id,name,type')
            ->where('product_id', $product->id)
            ->where('product_variant_id', $variantKey)
            ->get()
            ->map(fn ($bs) => [
                'branch_id' => $bs->branch_id,
                'branch_name' => $bs->branch?->name ?? '—',
                'branch_type' => $bs->branch?->type ?? 'sync',
                'quantity' => $bs->quantity,
            ])
            ->all();
    }

    /**
     * Recalcule le stock depuis l'historique complet des mouvements.
     * Usage : vérification d'intégrité, réparation de données.
     * NE PAS appeler sur le chemin critique (lent sur long historique).
     */
    public function recomputeFromHistory(Product $product, ?ProductVariant $variant = null): float
    {
        $lastMovement = StockMovement::where('product_id', $product->id)
            ->when(
                $variant,
                fn ($q) => $q->where('product_variant_id', $variant->id),
                fn ($q) => $q->whereNull('product_variant_id'),
            )
            ->latest('id')
            ->first();

        return $lastMovement?->stock_after ?? 0.0;
    }

    // ─── Méthodes privées ─────────────────────────────────────────────────────

    /**
     * Résout la succursale courante.
     * Si aucune n'est définie (seeders, Artisan), auto-résout la succursale principale.
     */
    private function resolveBranchId(): ?int
    {
        $branchId = $this->branchService->currentId();

        if ($branchId === null && $this->tenantService->hasCurrentTenant()) {
            $branchId = Branch::where('tenant_id', $this->tenantService->currentId())
                ->where('type', 'principal')
                ->value('id');
        }

        return $branchId;
    }

    private function computeStockAfter(float $stockBefore, string $type, float $quantity): float
    {
        return match ($type) {
            'in' => $stockBefore + $quantity,
            'out' => $stockBefore - $quantity,
            'return' => $stockBefore + $quantity,
            'adjustment' => $stockBefore + $quantity,
        };
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
                fn ($q) => $q->where('product_variant_id', $variant->id),
                fn ($q) => $q->whereNull('product_variant_id'),
            )
            ->first();
    }

    private function updateLotQuantity(ProductLot $lot, string $type, float $quantity): void
    {
        match ($type) {
            'in' => $lot->increment('quantity_remaining', abs($quantity)),
            'out' => $lot->decrement('quantity_remaining', abs($quantity)),
            'return' => $lot->increment('quantity_remaining', abs($quantity)),
            default => null,
        };
    }

    private function dispatchStockAlertIfNeeded(
        StockMovement $movement,
        Product $product,
        ?ProductVariant $variant,
        string $type,
        float $quantity,
    ): void {
        $isOutbound = $type === 'out' || ($type === 'adjustment' && $quantity < 0);
        if (! $isOutbound) {
            return;
        }

        $threshold = (int) ($variant?->alert_threshold ?? $product->alert_threshold ?? 0);
        $wasAbove = $movement->stock_before > $threshold;
        $isBelow = $movement->stock_after <= $threshold;

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
                .implode(', ', self::VALID_TYPES)
            );
        }

        if ($type !== 'adjustment' && $quantity <= 0) {
            throw new InvalidArgumentException(
                "La quantité doit être strictement positive pour le type '{$type}'."
            );
        }
    }
}
