<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\InventorySession;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly TenantService $tenantService,
    ) {}

    // ─── Création d'une session d'inventaire ──────────────────────────────────

    public function create(User $user, ?string $notes): InventorySession
    {
        $tenant = $this->tenantService->current();
        $reference = $this->generateReference($tenant);

        return InventorySession::create([
            'tenant_id' => $tenant->id,
            'reference' => $reference,
            'status' => 'draft',
            'notes' => $notes,
            'created_by' => $user->id,
        ]);
    }

    // ─── Lignes d'inventaire : tous les produits + valeurs saisies ────────────

    /**
     * Retourne toutes les lignes inventoriables du tenant :
     * un enregistrement par produit sans variante + un par variante active.
     * Chaque ligne est enrichie des valeurs déjà saisies dans la session.
     */
    public function lines(InventorySession $session, ?string $search, ?int $categoryId): array
    {
        // Index des items déjà saisis, clé "productId-variantId"
        $existing = $session->items
            ->keyBy(fn ($item) => "{$item->product_id}-{$item->variant_id}");

        $tenantId = $session->tenant_id;

        $query = Product::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->with(['category:id,name', 'variants' => fn ($q) => $q->where('is_active', true)])
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->when($categoryId, fn ($q) => $q->where('category_id', $categoryId))
            ->orderBy('name');

        $lines = [];

        foreach ($query->get() as $product) {
            if (! $product->has_variants) {
                $key = "{$product->id}-";
                $item = $existing->get($key);
                $lines[] = [
                    'product_id' => $product->id,
                    'product_uid' => $product->uid,
                    'variant_id' => null,
                    'name' => $product->name,
                    'sku' => $product->sku ?? '',
                    'variant_summary' => null,
                    'category_name' => $product->category?->name,
                    'unit' => $product->unit,
                    'expected_qty' => (float) $product->stock_quantity,
                    'counted_qty' => $item ? (float) $item->counted_qty : null,
                    'item_id' => $item?->id,
                ];
            } else {
                foreach ($product->variants as $variant) {
                    $key = "{$product->id}-{$variant->id}";
                    $item = $existing->get($key);
                    $lines[] = [
                        'product_id' => $product->id,
                        'product_uid' => $product->uid,
                        'variant_id' => $variant->id,
                        'name' => $product->name,
                        'sku' => $variant->sku ?? '',
                        'variant_summary' => $variant->attribute_summary,
                        'category_name' => $product->category?->name,
                        'unit' => $product->unit,
                        'expected_qty' => (float) $variant->stock_quantity,
                        'counted_qty' => $item ? (float) $item->counted_qty : null,
                        'item_id' => $item?->id,
                    ];
                }
            }
        }

        return $lines;
    }

    // ─── Sauvegarde d'un item (upsert) ────────────────────────────────────────

    public function saveItem(
        InventorySession $session,
        int $productId,
        ?int $variantId,
        float $expectedQty,
        float $countedQty,
    ): InventoryItem {
        return InventoryItem::updateOrCreate(
            [
                'inventory_session_id' => $session->id,
                'product_id' => $productId,
                'variant_id' => $variantId,
            ],
            [
                'expected_qty' => $expectedQty,
                'counted_qty' => $countedQty,
            ],
        );
    }

    // ─── Confirmation : application de tous les ajustements ──────────────────

    public function confirm(InventorySession $session, User $user): InventorySession
    {
        if ($session->status !== 'draft') {
            throw new \LogicException('Cet inventaire a déjà été confirmé.');
        }

        $items = $session->items()->with(['product', 'variant'])->get();

        if ($items->isEmpty()) {
            throw new \LogicException('Aucune ligne saisie. Comptez au moins un produit avant de valider.');
        }

        DB::transaction(function () use ($session, $items, $user) {
            foreach ($items as $item) {
                $delta = $item->counted_qty - $item->expected_qty;

                // Aucun ajustement si différence = 0
                if (bccomp((string) $delta, '0', 3) === 0) {
                    continue;
                }

                $this->stockService->adjust(
                    product: $item->product,
                    type: 'adjustment',
                    quantity: $delta,                  // delta signé
                    source: 'inventory',
                    sourceId: $item->id,
                    variant: $item->variant,
                    notes: "Inventaire {$session->reference}",
                );
            }

            $session->update([
                'status' => 'confirmed',
                'confirmed_by' => $user->id,
                'confirmed_at' => now(),
            ]);
        });

        return $session->refresh();
    }

    // ─── Export CSV ───────────────────────────────────────────────────────────

    public function exportCsv(InventorySession $session): string
    {
        $items = $session->items()
            ->with(['product.category', 'variant'])
            ->orderBy('product_id')
            ->get();

        $rows = [['Référence', 'Statut', 'Date', 'Notes']];
        $rows[] = [
            $session->reference,
            $session->status === 'confirmed' ? 'Confirmé' : 'Brouillon',
            $session->created_at->format('d/m/Y'),
            $session->notes ?? '',
        ];
        $rows[] = [];
        $rows[] = ['Produit', 'SKU', 'Variante', 'Catégorie', 'Unité', 'Stock attendu', 'Compté', 'Écart'];

        foreach ($items as $item) {
            $diff = $item->counted_qty - $item->expected_qty;
            $rows[] = [
                $item->product->name,
                $item->variant?->sku ?? ($item->product->sku ?? ''),
                $item->variant?->attribute_summary ?? '',
                $item->product->category?->name ?? '',
                $item->product->unit ?? '',
                $item->expected_qty,
                $item->counted_qty,
                ($diff >= 0 ? '+' : '').$diff,
            ];
        }

        $output = '';
        foreach ($rows as $row) {
            $output .= implode(';', array_map(
                fn ($v) => '"'.str_replace('"', '""', (string) $v).'"',
                $row,
            ))."\r\n";
        }

        return "\xEF\xBB\xBF".$output; // BOM UTF-8 pour Excel
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function generateReference(Tenant $tenant): string
    {
        $year = now()->year;

        $count = InventorySession::where('tenant_id', $tenant->id)
            ->where('reference', 'like', "INV-{$year}-%")
            ->lockForUpdate()
            ->count();

        return sprintf('INV-%d-%05d', $year, $count + 1);
    }
}
