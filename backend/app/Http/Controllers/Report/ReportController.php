<?php

namespace App\Http\Controllers\Report;

use App\Http\Controllers\Controller;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(private readonly TenantService $tenantService) {}

    // ── CA par période ────────────────────────────────────────────────────────

    /**
     * Chiffre d'affaires sur une plage de dates avec graphique par période.
     *
     * Params : from (YYYY-MM-DD), to (YYYY-MM-DD), group_by (day|month), format (csv)
     */
    public function sales(Request $request): JsonResponse|StreamedResponse
    {
        $tenantId = $this->tenantService->currentId();
        [$from, $to] = $this->parseDateRange($request);

        $groupBy    = in_array($request->input('group_by'), ['day', 'month'], true)
            ? $request->input('group_by')
            : 'day';
        $dateFormat = $groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
        $dateFmt    = $this->dateFormatExpr('confirmed_at', $dateFormat);
        $dateFmtS   = $this->dateFormatExpr('s.confirmed_at', $dateFormat);

        // ── Revenue + sales_count depuis sales (sans JOIN — évite la multiplication des lignes)
        $summaryRow = DB::selectOne("
            SELECT COUNT(*) AS sales_count, COALESCE(SUM(total), 0) AS revenue
            FROM sales
            WHERE tenant_id = ? AND status = 'confirmed'
              AND DATE(confirmed_at) BETWEEN ? AND ?
        ", [$tenantId, $from, $to]);

        // ── Profit depuis sale_items (JOIN nécessaire pour filtrer par tenant/statut)
        $profitRow = DB::selectOne("
            SELECT COALESCE(SUM(si.total - si.cost_price * si.quantity), 0) AS profit
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            WHERE s.tenant_id = ? AND s.status = 'confirmed'
              AND DATE(s.confirmed_at) BETWEEN ? AND ?
        ", [$tenantId, $from, $to]);

        // ── Graphique revenue par période (depuis sales uniquement, expression driver-aware)
        $revenueRows = DB::select("
            SELECT
                {$dateFmt} AS period,
                COUNT(*)                     AS sales_count,
                COALESCE(SUM(total), 0)      AS revenue
            FROM sales
            WHERE tenant_id = ? AND status = 'confirmed'
              AND DATE(confirmed_at) BETWEEN ? AND ?
            GROUP BY {$dateFmt}
            ORDER BY period ASC
        ", [$tenantId, $from, $to]);

        // ── Profit par période (depuis sale_items)
        $profitRows = DB::select("
            SELECT
                {$dateFmtS}                                                  AS period,
                COALESCE(SUM(si.total - si.cost_price * si.quantity), 0)     AS profit
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            WHERE s.tenant_id = ? AND s.status = 'confirmed'
              AND DATE(s.confirmed_at) BETWEEN ? AND ?
            GROUP BY {$dateFmtS}
        ", [$tenantId, $from, $to]);

        $profitByPeriod = collect($profitRows)->pluck('profit', 'period');

        $chart = collect($revenueRows)->map(fn ($r) => [
            'period'      => $r->period,
            'sales_count' => (int)   $r->sales_count,
            'revenue'     => (float) $r->revenue,
            'profit'      => (float) ($profitByPeriod->get($r->period) ?? 0),
        ])->all();

        $salesCount   = (int)   ($summaryRow->sales_count ?? 0);
        $totalRevenue = (float) ($summaryRow->revenue     ?? 0);
        $totalProfit  = (float) ($profitRow->profit       ?? 0);

        if ($request->input('format') === 'csv') {
            return $this->csvResponse(
                filename: "ventes_{$from}_{$to}.csv",
                headers:  ['Période', 'Nb ventes', 'CA (FCFA)', 'Bénéfice (FCFA)'],
                rows:     array_map(
                    fn ($r) => [$r['period'], $r['sales_count'], $r['revenue'], $r['profit']],
                    $chart
                ),
            );
        }

        return response()->json([
            'period'  => ['from' => $from, 'to' => $to],
            'summary' => [
                'sales_count'    => $salesCount,
                'revenue'        => $totalRevenue,
                'profit'         => $totalProfit,
                'average_basket' => $salesCount > 0 ? round($totalRevenue / $salesCount) : 0,
            ],
            'chart' => $chart,
        ]);
    }

    // ── Top produits ──────────────────────────────────────────────────────────

    /**
     * Produits les plus vendus sur une plage de dates.
     *
     * Params : from, to, limit (max 100, défaut 20), format (csv)
     */
    public function products(Request $request): JsonResponse|StreamedResponse
    {
        $tenantId = $this->tenantService->currentId();
        [$from, $to] = $this->parseDateRange($request);
        $limit = min((int) $request->input('limit', 50), 200);

        $rows = DB::select("
            SELECT
                p.id                            AS product_id,
                p.name,
                c.name                          AS category,
                COALESCE(agg.qty_sold, 0)       AS qty_sold,
                COALESCE(agg.revenue, 0)        AS revenue,
                COALESCE(agg.profit, 0)         AS profit,
                CASE WHEN COALESCE(agg.revenue, 0) > 0
                    THEN ROUND(COALESCE(agg.profit, 0) / agg.revenue * 100, 1)
                    ELSE 0
                END                             AS margin_rate
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN (
                SELECT
                    si.product_id,
                    SUM(si.quantity)                                         AS qty_sold,
                    COALESCE(SUM(si.total), 0)                               AS revenue,
                    COALESCE(SUM(si.total - si.cost_price * si.quantity), 0) AS profit
                FROM sale_items si
                JOIN sales s ON s.id = si.sale_id
                WHERE s.tenant_id = ?
                  AND s.status    = 'confirmed'
                  AND DATE(s.confirmed_at) BETWEEN ? AND ?
                GROUP BY si.product_id
            ) agg ON agg.product_id = p.id
            WHERE p.tenant_id = ? AND p.deleted_at IS NULL
            ORDER BY revenue DESC, p.name ASC
            LIMIT ?
        ", [$tenantId, $from, $to, $tenantId, $limit]);

        $data = collect($rows)->map(fn ($r) => [
            'product_id'  => (int)   $r->product_id,
            'name'        => $r->name,
            'category'    => $r->category,
            'qty_sold'    => (float) $r->qty_sold,
            'revenue'     => (float) $r->revenue,
            'profit'      => (float) $r->profit,
            'margin_rate' => (float) $r->margin_rate,
        ])->all();

        if ($request->input('format') === 'csv') {
            return $this->csvResponse(
                filename: "top_produits_{$from}_{$to}.csv",
                headers:  ['Produit', 'Catégorie', 'Qté vendue', 'CA (FCFA)', 'Bénéfice (FCFA)', 'Marge (%)'],
                rows:     array_map(
                    fn ($r) => [$r['name'], $r['category'] ?? '', $r['qty_sold'], $r['revenue'], $r['profit'], $r['margin_rate']],
                    $data
                ),
            );
        }

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'data'   => $data,
        ]);
    }

    // ── Résumé stock ──────────────────────────────────────────────────────────

    /**
     * Synthèse des mouvements de stock sur une plage de dates.
     *
     * Params : from, to, format (csv)
     */
    public function stock(Request $request): JsonResponse|StreamedResponse
    {
        $tenantId = $this->tenantService->currentId();
        [$from, $to] = $this->parseDateRange($request);

        // Totaux par type
        $summaryRows = DB::select("
            SELECT type, COALESCE(SUM(quantity), 0) AS total
            FROM stock_movements
            WHERE tenant_id = ?
              AND DATE(created_at) BETWEEN ? AND ?
            GROUP BY type
        ", [$tenantId, $from, $to]);

        $summary = collect($summaryRows)->pluck('total', 'type')
            ->map(fn ($v) => (float) $v)
            ->toArray();

        // Valeur totale du stock actuel (indépendante de la période)
        $stockValueRow = DB::selectOne("
            SELECT COALESCE(SUM(stock_quantity * cost_price), 0) AS total
            FROM products
            WHERE tenant_id = ? AND deleted_at IS NULL
        ", [$tenantId]);

        // Tous les produits du tenant, avec leurs mouvements sur la période (LEFT JOIN)
        $rows = DB::select("
            SELECT
                p.id                                                        AS product_id,
                p.name,
                COALESCE(agg.total_in, 0)                                   AS total_in,
                COALESCE(agg.total_out, 0)                                  AS total_out,
                COALESCE(agg.total_return, 0)                               AS total_return,
                COALESCE(agg.total_adjustment, 0)                           AS total_adjustment,
                p.stock_quantity                                             AS current_stock,
                COALESCE(p.cost_price, 0) * p.stock_quantity                AS stock_value
            FROM products p
            LEFT JOIN (
                SELECT
                    sm.product_id,
                    SUM(CASE WHEN sm.type = 'in'         THEN sm.quantity ELSE 0 END) AS total_in,
                    SUM(CASE WHEN sm.type = 'out'        THEN sm.quantity ELSE 0 END) AS total_out,
                    SUM(CASE WHEN sm.type = 'return'     THEN sm.quantity ELSE 0 END) AS total_return,
                    SUM(CASE WHEN sm.type = 'adjustment' THEN sm.quantity ELSE 0 END) AS total_adjustment
                FROM stock_movements sm
                WHERE sm.tenant_id = ?
                  AND DATE(sm.created_at) BETWEEN ? AND ?
                GROUP BY sm.product_id
            ) agg ON agg.product_id = p.id
            WHERE p.tenant_id = ? AND p.deleted_at IS NULL
            ORDER BY (COALESCE(agg.total_in, 0) + COALESCE(agg.total_out, 0)) DESC, p.name ASC
            LIMIT 1000
        ", [$tenantId, $from, $to, $tenantId]);

        $data = collect($rows)->map(fn ($r) => [
            'product_id'       => (int)   $r->product_id,
            'name'             => $r->name,
            'total_in'         => (float) $r->total_in,
            'total_out'        => (float) $r->total_out,
            'total_return'     => (float) $r->total_return,
            'total_adjustment' => (float) $r->total_adjustment,
            'current_stock'    => (float) $r->current_stock,
            'stock_value'      => (float) $r->stock_value,
        ])->all();

        if ($request->input('format') === 'csv') {
            return $this->csvResponse(
                filename: "stock_{$from}_{$to}.csv",
                headers:  ['Produit', 'Entrées', 'Sorties', 'Retours', 'Ajustements', 'Stock actuel', 'Valeur (FCFA)'],
                rows:     array_map(
                    fn ($r) => [$r['name'], $r['total_in'], $r['total_out'], $r['total_return'], $r['total_adjustment'], $r['current_stock'], $r['stock_value']],
                    $data
                ),
            );
        }

        return response()->json([
            'period'  => ['from' => $from, 'to' => $to],
            'summary' => [
                'total_in'          => $summary['in']         ?? 0,
                'total_out'         => $summary['out']        ?? 0,
                'total_return'      => $summary['return']     ?? 0,
                'total_adjustment'  => $summary['adjustment'] ?? 0,
                'total_stock_value' => (float) ($stockValueRow->total ?? 0),
            ],
            'data' => $data,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Génère une expression SQL de formatage de date compatible MySQL et SQLite.
     * MySQL : DATE_FORMAT(col, '%Y-%m-%d') — SQLite : strftime('%Y-%m-%d', col)
     */
    private function dateFormatExpr(string $column, string $format): string
    {
        return DB::getDriverName() === 'sqlite'
            ? "strftime('{$format}', {$column})"
            : "DATE_FORMAT({$column}, '{$format}')";
    }

    private function parseDateRange(Request $request): array
    {
        $from = $request->input('from', now()->startOfMonth()->toDateString());
        $to   = $request->input('to',   now()->toDateString());

        // Accepter uniquement YYYY-MM-DD pour éviter les injections de format
        $from = preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) ? $from : now()->startOfMonth()->toDateString();
        $to   = preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)   ? $to   : now()->toDateString();

        // Garantir from <= to
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }

        return [$from, $to];
    }

    private function csvResponse(string $filename, array $headers, array $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM UTF-8 — requis pour Excel FR
            fputcsv($out, $headers, ';');
            foreach ($rows as $row) {
                fputcsv($out, $row, ';');
            }
            fclose($out);
        }, $filename, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
