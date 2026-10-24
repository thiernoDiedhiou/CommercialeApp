<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\ShopOrder;
use App\Services\BranchService;
use App\Services\TenantService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DashboardController extends Controller
{
    public function __construct(
        private readonly TenantService $tenantService,
        private readonly BranchService $branchService,
    ) {}

    /**
     * Tableau de bord complet en 6 requêtes SQL maximum.
     *
     * Requête 1 : stats du jour (ventes + items JOIN → count/revenue/profit)
     * Requête 2 : encaissements du jour par méthode
     * Requête 3 : graphique 7 jours glissants
     * Requête 4 : top 5 produits du mois courant
     * Requête 5 : alertes de stock (UNION produits + variantes)
     * Requête 6 : 5 dernières ventes confirmées
     * + conditionnelle : lots expirant (seulement si has_expiry produits existent)
     *
     * En mode succursale (X-Branch-ID), les données POS sont filtrées par branch_id.
     * Les commandes boutique (shop_orders) ne sont incluses qu'en vue globale.
     */
    public function summary(Request $request): JsonResponse
    {
        $tenantId = $this->tenantService->currentId();
        $branchId = $this->branchService->currentId();
        $inBranch = $branchId !== null;

        // ── Bornes de période (filtre optionnel date_from / date_to) ────────
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        if ($dateFrom && $dateTo) {
            $periodUtcStart = Carbon::parse($dateFrom)->startOfDay()->utc()->toDateTimeString();
            $periodUtcEnd = Carbon::parse($dateTo)->endOfDay()->utc()->toDateTimeString();
        } else {
            $periodUtcStart = Carbon::today()->utc()->toDateTimeString();
            $periodUtcEnd = Carbon::tomorrow()->utc()->toDateTimeString();
        }

        $tzOffsetSec = Carbon::now()->getOffset();

        // Clause + binding optionnels pour filtrer les ventes POS par succursale
        $branchSql = $inBranch ? 'AND s.branch_id = ?' : '';
        $branchBinding = $inBranch ? [$branchId] : [];

        // ── 1a. Stats POS de la période ──────────────────────────────────────
        $posTodayRow = DB::selectOne("
            SELECT
                COUNT(DISTINCT s.id)                                     AS sales_count,
                COALESCE(SUM(s.total), 0)                                AS revenue,
                COALESCE(SUM(si.total - si.cost_price * si.quantity), 0) AS profit
            FROM sales s
            LEFT JOIN sale_items si ON si.sale_id = s.id
            WHERE s.tenant_id = ?
              AND s.status    = 'confirmed'
              AND s.confirmed_at >= ? AND s.confirmed_at < ?
              {$branchSql}
        ", [$tenantId, $periodUtcStart, $periodUtcEnd, ...$branchBinding]);

        // ── 1b. Stats boutique (uniquement en vue globale — pas de branch_id sur shop_orders)
        $shopTodayRow = null;
        if (! $inBranch) {
            $shopTodayRow = DB::selectOne("
                SELECT
                    COUNT(DISTINCT so.id)                                                                   AS orders_count,
                    COALESCE(SUM(so.total), 0)                                                              AS revenue,
                    COALESCE(SUM(soi.total - COALESCE(pv.cost_price, p.cost_price, 0) * soi.quantity), 0)  AS profit
                FROM shop_orders so
                LEFT JOIN shop_order_items soi ON soi.shop_order_id = so.id
                LEFT JOIN products p           ON p.id  = soi.product_id
                LEFT JOIN product_variants pv  ON pv.id = soi.variant_id
                WHERE so.tenant_id = ?
                  AND so.status NOT IN ('cancelled', 'pending')
                  AND so.confirmed_at >= ? AND so.confirmed_at < ?
            ", [$tenantId, $periodUtcStart, $periodUtcEnd]);
        }

        // ── 2. Encaissements de la période par méthode ───────────────────────
        $paymentRows = DB::select("
            SELECT p.method, COALESCE(SUM(p.amount), 0) AS total
            FROM payments p
            JOIN sales s ON s.id = p.sale_id
            WHERE s.tenant_id = ?
              AND s.status    = 'confirmed'
              AND s.confirmed_at >= ? AND s.confirmed_at < ?
              {$branchSql}
            GROUP BY p.method
        ", [$tenantId, $periodUtcStart, $periodUtcEnd, ...$branchBinding]);

        $paymentsByMethod = collect($paymentRows)->pluck('total', 'method')
            ->map(fn ($v) => (float) $v)
            ->toArray();

        // ── 3. Graphique glissant ────────────────────────────────────────────
        $chartDays = min(max((int) $request->input('chart_days', 7), 7), 90);
        $chartUtcStart = Carbon::today()->subDays($chartDays - 1)->utc()->toDateTimeString();

        $branchChartSql = $inBranch ? 'AND s.branch_id = ?' : '';
        $branchChartBinding = $inBranch ? [$branchId] : [];

        if ($inBranch) {
            // En mode succursale : seulement les ventes POS de cette succursale
            $weekRows = DB::select("
                SELECT
                    DATE(DATE_ADD(s.confirmed_at, INTERVAL {$tzOffsetSec} SECOND)) AS date,
                    COUNT(*)                  AS sales_count,
                    COALESCE(SUM(s.total), 0) AS revenue
                FROM sales s
                WHERE s.tenant_id = ?
                  AND s.status    = 'confirmed'
                  AND s.confirmed_at >= ?
                  AND s.branch_id = ?
                GROUP BY DATE(DATE_ADD(s.confirmed_at, INTERVAL {$tzOffsetSec} SECOND))
                ORDER BY date ASC
            ", [$tenantId, $chartUtcStart, $branchId]);
        } else {
            // Vue globale : UNION POS + boutique
            $weekRows = DB::select("
                SELECT
                    date,
                    SUM(sales_count) AS sales_count,
                    SUM(revenue)     AS revenue
                FROM (
                    SELECT
                        DATE(DATE_ADD(s.confirmed_at, INTERVAL {$tzOffsetSec} SECOND)) AS date,
                        COUNT(*)                  AS sales_count,
                        COALESCE(SUM(s.total), 0) AS revenue
                    FROM sales s
                    WHERE s.tenant_id = ?
                      AND s.status    = 'confirmed'
                      AND s.confirmed_at >= ?
                    GROUP BY DATE(DATE_ADD(s.confirmed_at, INTERVAL {$tzOffsetSec} SECOND))

                    UNION ALL

                    SELECT
                        DATE(DATE_ADD(so.confirmed_at, INTERVAL {$tzOffsetSec} SECOND)) AS date,
                        COUNT(*)                   AS sales_count,
                        COALESCE(SUM(so.total), 0) AS revenue
                    FROM shop_orders so
                    WHERE so.tenant_id = ?
                      AND so.status NOT IN ('cancelled', 'pending')
                      AND so.confirmed_at >= ?
                    GROUP BY DATE(DATE_ADD(so.confirmed_at, INTERVAL {$tzOffsetSec} SECOND))
                ) combined
                GROUP BY date
                ORDER BY date ASC
            ", [$tenantId, $chartUtcStart, $tenantId, $chartUtcStart]);
        }

        $weekByDate = collect($weekRows)->keyBy('date');
        $weekChart = [];
        for ($i = $chartDays - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $row = $weekByDate->get($date);
            $weekChart[] = [
                'date' => $date,
                'sales_count' => $row ? (int) $row->sales_count : 0,
                'revenue' => $row ? (float) $row->revenue : 0.0,
            ];
        }

        // ── [ajout] Montant en attente (factures — tenant-wide dans tous les modes) ──
        $pendingRow = DB::selectOne("
            SELECT COALESCE(SUM(total - paid_amount), 0) AS pending_amount
            FROM invoices
            WHERE tenant_id = ? AND status IN ('sent', 'overdue')
        ", [$tenantId]);

        // ── 4. Top 5 produits de la période ─────────────────────────────────
        if ($inBranch) {
            // Mode succursale : uniquement les ventes POS de cette succursale
            $topProductRows = DB::select("
                SELECT
                    si.product_id,
                    p.uid        AS product_uid,
                    p.name,
                    p.image_path,
                    SUM(si.quantity)           AS qty_sold,
                    COALESCE(SUM(si.total), 0) AS revenue
                FROM sale_items si
                JOIN products p ON p.id = si.product_id
                JOIN sales    s ON s.id = si.sale_id
                WHERE s.tenant_id = ?
                  AND s.status    = 'confirmed'
                  AND s.confirmed_at >= ?
                  AND s.branch_id = ?
                GROUP BY si.product_id, p.uid, p.name, p.image_path
                ORDER BY revenue DESC
                LIMIT 5
            ", [$tenantId, $periodUtcStart, $branchId]);
        } else {
            // Vue globale : UNION POS + boutique
            $topProductRows = DB::select("
                SELECT
                    product_id,
                    product_uid,
                    name,
                    image_path,
                    SUM(qty_sold) AS qty_sold,
                    SUM(revenue)  AS revenue
                FROM (
                    SELECT
                        si.product_id,
                        p.uid        AS product_uid,
                        p.name,
                        p.image_path,
                        SUM(si.quantity)           AS qty_sold,
                        COALESCE(SUM(si.total), 0) AS revenue
                    FROM sale_items si
                    JOIN products p ON p.id = si.product_id
                    JOIN sales    s ON s.id = si.sale_id
                    WHERE s.tenant_id = ?
                      AND s.status    = 'confirmed'
                      AND s.confirmed_at >= ?
                    GROUP BY si.product_id, p.uid, p.name, p.image_path

                    UNION ALL

                    SELECT
                        soi.product_id,
                        p.uid        AS product_uid,
                        p.name,
                        p.image_path,
                        SUM(soi.quantity)           AS qty_sold,
                        COALESCE(SUM(soi.total), 0) AS revenue
                    FROM shop_order_items soi
                    JOIN products    p  ON p.id  = soi.product_id
                    JOIN shop_orders so ON so.id = soi.shop_order_id
                    WHERE so.tenant_id = ?
                      AND so.status NOT IN ('cancelled', 'pending')
                      AND so.confirmed_at >= ?
                    GROUP BY soi.product_id, p.uid, p.name, p.image_path
                ) combined
                GROUP BY product_id, product_uid, name, image_path
                ORDER BY revenue DESC
                LIMIT 5
            ", [$tenantId, $periodUtcStart, $tenantId, $periodUtcStart]);
        }

        // ── 5. Alertes de stock (toujours tenant-wide — stock global sur Product) ──
        $stockAlertRows = DB::select('
            SELECT
                p.id         AS product_id,
                p.uid        AS product_uid,
                p.name,
                p.image_path,
                NULL         AS variant_id,
                NULL         AS variant,
                p.stock_quantity   AS current_stock,
                p.alert_threshold  AS threshold
            FROM products p
            WHERE p.tenant_id       = ?
              AND p.has_variants    = 0
              AND p.is_active       = 1
              AND p.alert_threshold IS NOT NULL
              AND p.stock_quantity  <= p.alert_threshold

            UNION ALL

            SELECT
                p.id         AS product_id,
                p.uid        AS product_uid,
                p.name,
                p.image_path,
                pv.id        AS variant_id,
                pv.attribute_summary AS variant,
                pv.stock_quantity    AS current_stock,
                COALESCE(pv.alert_threshold, p.alert_threshold) AS threshold
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE p.tenant_id   = ?
              AND p.is_active   = 1
              AND COALESCE(pv.alert_threshold, p.alert_threshold) IS NOT NULL
              AND pv.stock_quantity <= COALESCE(pv.alert_threshold, p.alert_threshold)

            ORDER BY current_stock ASC
            LIMIT 5
        ', [$tenantId, $tenantId]);

        // ── 6. 5 dernières transactions ──────────────────────────────────────
        $recentPOS = Sale::confirmed()
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->with(['customer:id,name'])
            ->latest('confirmed_at')
            ->limit(5)
            ->get(['uid', 'reference', 'customer_id', 'total', 'status', 'confirmed_at', 'created_at'])
            ->map(fn ($s) => [
                'uid' => $s->uid,
                'reference' => $s->reference,
                'customer' => $s->customer?->name,
                'total' => (float) $s->total,
                'status' => $s->status,
                'channel' => 'pos',
                'confirmed_at' => $s->confirmed_at?->toISOString(),
                'created_at' => $s->created_at?->toISOString(),
            ]);

        // Boutique uniquement en vue globale
        $recentShop = collect();
        if (! $inBranch) {
            $recentShop = ShopOrder::where('tenant_id', $tenantId)
                ->whereNotNull('confirmed_at')
                ->whereNotIn('status', ['cancelled', 'pending'])
                ->latest('confirmed_at')
                ->limit(5)
                ->get(['uid', 'reference', 'customer_name', 'total', 'status', 'confirmed_at', 'created_at'])
                ->map(fn ($o) => [
                    'uid' => $o->uid,
                    'reference' => $o->reference,
                    'customer' => $o->customer_name,
                    'total' => (float) $o->total,
                    'status' => $o->status,
                    'channel' => 'shop',
                    'confirmed_at' => $o->confirmed_at?->toISOString(),
                    'created_at' => $o->created_at?->toISOString(),
                ]);
        }

        $recentSales = $recentPOS->concat($recentShop)
            ->sortByDesc('confirmed_at')
            ->take(5)
            ->values();

        // ── [Conditionnel] Lots expirant bientôt ────────────────────────────
        $expiringSoon = [];
        $hasExpiry = Product::where('tenant_id', $tenantId)->where('has_expiry', true)->exists();

        if ($hasExpiry) {
            $days = (int) ($this->tenantService->setting('expiry_alert_days') ?? 30);

            $expiryRows = DB::select('
                SELECT
                    p.name                        AS product,
                    pl.lot_number,
                    pl.expiry_date,
                    pl.quantity_remaining         AS qty_remaining,
                    DATEDIFF(pl.expiry_date, CURDATE()) AS days_remaining
                FROM product_lots pl
                JOIN products p ON p.id = pl.product_id
                WHERE p.tenant_id           = ?
                  AND pl.is_active          = 1
                  AND pl.quantity_remaining > 0
                  AND pl.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
                ORDER BY pl.expiry_date ASC
            ', [$tenantId, $days]);

            $expiringSoon = collect($expiryRows)->map(fn ($r) => [
                'product_name' => $r->product,
                'lot_number' => $r->lot_number,
                'expiry_date' => $r->expiry_date,
                'quantity_remaining' => (float) $r->qty_remaining,
                'days_remaining' => (int) $r->days_remaining,
            ])->all();
        }

        $posSalesCount = (int) ($posTodayRow->sales_count ?? 0);
        $posRevenue = (float) ($posTodayRow->revenue ?? 0);
        $posProfit = (float) ($posTodayRow->profit ?? 0);
        $shopOrderCount = (int) ($shopTodayRow->orders_count ?? 0);
        $shopRevenue = (float) ($shopTodayRow->revenue ?? 0);
        $shopProfit = (float) ($shopTodayRow->profit ?? 0);

        return response()->json([
            'today' => [
                'sales_count' => $posSalesCount + $shopOrderCount,
                'revenue' => $posRevenue + $shopRevenue,
                'profit' => $posProfit + $shopProfit,
                'pending_amount' => (float) ($pendingRow->pending_amount ?? 0),
                'pos_sales_count' => $posSalesCount,
                'pos_revenue' => $posRevenue,
                'shop_orders_count' => $shopOrderCount,
                'shop_orders_revenue' => $shopRevenue,
            ],
            'by_payment_method' => $paymentsByMethod,
            'week_chart' => $weekChart,
            'top_products' => collect($topProductRows)->map(fn ($r) => [
                'product_id' => $r->product_id,
                'product_uid' => $r->product_uid,
                'product_name' => $r->name,
                'image_url' => $r->image_path ? Storage::disk('public')->url($r->image_path) : null,
                'quantity_sold' => (float) $r->qty_sold,
                'revenue' => (float) $r->revenue,
            ]),
            'stock_alerts' => collect($stockAlertRows)->map(fn ($r) => [
                'product_id' => $r->product_id,
                'product_uid' => $r->product_uid,
                'product_name' => $r->name,
                'image_url' => $r->image_path ? Storage::disk('public')->url($r->image_path) : null,
                'variant_id' => $r->variant_id,
                'variant_summary' => $r->variant,
                'current_stock' => (float) $r->current_stock,
                'threshold' => (int) $r->threshold,
            ]),
            'expiring_soon' => $expiringSoon,
            'recent_sales' => $recentSales,
        ]);
    }
}
