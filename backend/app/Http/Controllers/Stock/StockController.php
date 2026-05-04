<?php

namespace App\Http\Controllers\Stock;

use App\Exceptions\StockInsufficientException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Stock\StoreStockAdjustmentRequest;
use App\Models\Product;
use App\Models\ProductLot;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Services\StockService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StockController extends Controller
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly TenantService $tenantService,
    ) {}

    // ─── POST /api/v1/stock/adjust ────────────────────────────────────────────

    public function adjust(StoreStockAdjustmentRequest $request): JsonResponse
    {
        $product = Product::findOrFail($request->input('product_id'));
        $variant = $request->input('variant_id') ? ProductVariant::find($request->input('variant_id')) : null;
        $lot     = $request->input('lot_id') ? ProductLot::find($request->input('lot_id')) : null;

        try {
            $movement = $this->stockService->adjust(
                product:  $product,
                type:     $request->input('type'),
                quantity: (float) $request->input('quantity'),
                source:   'manual',
                sourceId: null,
                variant:  $variant,
                lot:      $lot,
                unitCost: $request->input('unit_cost') !== null ? (float) $request->input('unit_cost') : null,
                notes:    $request->input('note'),
            );

            return response()->json([
                'data'        => $movement->load(['product:id,name', 'variant:id,attribute_summary']),
                'stock_after' => $movement->stock_after,
            ], 201);
        } catch (StockInsufficientException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'STOCK_INSUFFICIENT'], 422);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'INVALID_ARGUMENT'], 422);
        }
    }

    // ─── GET /api/v1/stock/movements ──────────────────────────────────────────

    public function movements(Request $request): JsonResponse
    {
        $movements = StockMovement::select([
            'id', 'product_id', 'product_variant_id', 'lot_id', 'user_id',
            'type', 'quantity', 'unit_cost', 'stock_before', 'stock_after',
            'source', 'notes', 'created_at',
        ])
        ->with([
            'product:id,name',
            'variant:id,attribute_summary',
            'user:id,name',
            'lot:id,lot_number',
        ])
        ->when($request->product_id, fn($q) => $q->where('product_id', $request->product_id))
        ->when($request->variant_id, fn($q) => $q->where('product_variant_id', $request->variant_id))
        ->when($request->type, fn($q) => match ($request->type) {
            // 'sale' est une source, pas un type — map vers source pour la convenance
            'sale'   => $q->where('source', 'sale'),
            default  => $q->where('type', $request->type),
        })
        ->when($request->user_id, fn($q) => $q->where('user_id', $request->user_id))
        ->when(
            $request->from && $request->to,
            fn($q) => $q->whereBetween('created_at', [$request->from, $request->to])
        )
        ->latest('id')
        ->paginate(30);

        return response()->json($movements);
    }

    // ─── GET /api/v1/stock/alerts ─────────────────────────────────────────────

    public function alerts(Request $request): JsonResponse
    {
        $tenantId   = $this->tenantService->currentId();
        $categoryId = $request->integer('category_id') ?: null;
        $search     = $request->input('search');

        // Construction dynamique des WHERE pour éviter les injections
        // tout en restant flexible sur les filtres optionnels
        $where1    = [
            'p.tenant_id = ?', 'p.has_variants = 0', 'p.is_active = 1',
            'p.alert_threshold IS NOT NULL', 'p.stock_quantity <= p.alert_threshold',
        ];
        $bindings1 = [$tenantId];

        $where2    = [
            'p.tenant_id = ?', 'p.is_active = 1',
            'COALESCE(pv.alert_threshold, p.alert_threshold) IS NOT NULL',
            'pv.stock_quantity <= COALESCE(pv.alert_threshold, p.alert_threshold)',
        ];
        $bindings2 = [$tenantId];

        if ($categoryId) {
            $where1[] = 'p.category_id = ?';
            $bindings1[] = $categoryId;
            $where2[] = 'p.category_id = ?';
            $bindings2[] = $categoryId;
        }

        if ($search) {
            $where1[] = 'p.name LIKE ?';
            $bindings1[] = "%{$search}%";
            $where2[] = 'p.name LIKE ?';
            $bindings2[] = "%{$search}%";
        }

        $sql = '
            SELECT
                p.id                  AS product_id,
                p.name                AS product_name,
                NULL                  AS variant_id,
                NULL                  AS variant_summary,
                p.stock_quantity      AS current_stock,
                p.alert_threshold     AS threshold,
                c.name                AS category_name,
                p.unit
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE ' . implode(' AND ', $where1) . '

            UNION ALL

            SELECT
                p.id                            AS product_id,
                p.name                          AS product_name,
                pv.id                           AS variant_id,
                pv.attribute_summary            AS variant_summary,
                pv.stock_quantity               AS current_stock,
                COALESCE(pv.alert_threshold, p.alert_threshold) AS threshold,
                c.name                          AS category_name,
                p.unit
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE ' . implode(' AND ', $where2) . '

            ORDER BY current_stock ASC
        ';

        $rows = DB::select($sql, array_merge($bindings1, $bindings2));

        $collection = collect($rows)->map(fn($r) => [
            'product_id'      => $r->product_id,
            'product_name'    => $r->product_name,
            'variant_id'      => $r->variant_id,
            'variant_summary' => $r->variant_summary,
            'current_stock'   => (float) $r->current_stock,
            'threshold'       => (int)   $r->threshold,
            'category_name'   => $r->category_name,
            'unit'            => $r->unit,
        ]);

        $page    = $request->integer('page', 1);
        $perPage = 20;
        $total   = $collection->count();

        return response()->json(
            new LengthAwarePaginator(
                $collection->forPage($page, $perPage)->values(),
                $total,
                $perPage,
                $page,
                ['path' => $request->url(), 'query' => $request->query()]
            )
        );
    }

    // ─── GET /api/v1/stock/expiring ───────────────────────────────────────────

    public function expiring(Request $request): JsonResponse
    {
        $tenantId = $this->tenantService->currentId();

        // Court-circuit si aucun produit n'utilise la traçabilité par date d'expiry
        if (! Product::where('has_expiry', true)->exists()) {
            return response()->json(
                new LengthAwarePaginator([], 0, 20, 1, ['path' => $request->url()])
            );
        }

        $days = (int) ($this->tenantService->setting('expiry_alert_days') ?? 30);

        $rows = DB::select('
            SELECT
                p.id                       AS product_id,
                p.name                     AS product_name,
                pv.id                      AS variant_id,
                pv.attribute_summary       AS variant_summary,
                pl.lot_number,
                pl.expiry_date,
                DATEDIFF(pl.expiry_date, CURDATE()) AS days_remaining,
                pl.quantity_remaining
            FROM product_lots pl
            JOIN products p ON p.id = pl.product_id
            LEFT JOIN product_variants pv ON pv.id = pl.product_variant_id
            WHERE p.tenant_id            = ?
              AND pl.is_active           = 1
              AND pl.quantity_remaining  > 0
              AND pl.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY pl.expiry_date ASC
        ', [$tenantId, $days]);

        $collection = collect($rows)->map(fn($r) => [
            'product_id'         => $r->product_id,
            'product_name'       => $r->product_name,
            'variant_id'         => $r->variant_id,
            'variant_summary'    => $r->variant_summary,
            'lot_number'         => $r->lot_number,
            'expiry_date'        => $r->expiry_date,
            'days_remaining'     => (int)   $r->days_remaining,
            'quantity_remaining' => (float) $r->quantity_remaining,
        ]);

        $page    = $request->integer('page', 1);
        $perPage = 20;
        $total   = $collection->count();

        return response()->json(
            new LengthAwarePaginator(
                $collection->forPage($page, $perPage)->values(),
                $total,
                $perPage,
                $page,
                ['path' => $request->url(), 'query' => $request->query()]
            )
        );
    }
}
