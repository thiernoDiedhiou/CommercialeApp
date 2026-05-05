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

        // ── Graphique revenue par période (depuis sales uniquement)
        $revenueRows = DB::select("
            SELECT
                DATE_FORMAT(confirmed_at, ?) AS period,
                COUNT(*)                     AS sales_count,
                COALESCE(SUM(total), 0)      AS revenue
            FROM sales
            WHERE tenant_id = ? AND status = 'confirmed'
              AND DATE(confirmed_at) BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(confirmed_at, ?)
            ORDER BY period ASC
        ", [$dateFormat, $tenantId, $from, $to, $dateFormat]);

        // ── Profit par période (depuis sale_items)
        $profitRows = DB::select("
            SELECT
                DATE_FORMAT(s.confirmed_at, ?)                               AS period,
                COALESCE(SUM(si.total - si.cost_price * si.quantity), 0)     AS profit
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            WHERE s.tenant_id = ? AND s.status = 'confirmed'
              AND DATE(s.confirmed_at) BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(s.confirmed_at, ?)
        ", [$dateFormat, $tenantId, $from, $to, $dateFormat]);

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
        $limit = min((int) $request->input('limit', 20), 100);

        $rows = DB::select("
            SELECT
                si.product_id,
                p.name,
                c.name                                                   AS category,
                SUM(si.quantity)                                         AS qty_sold,
                COALESCE(SUM(si.total), 0)                               AS revenue,
                COALESCE(SUM(si.total - si.cost_price * si.quantity), 0) AS profit
            FROM sale_items si
            JOIN products  p ON p.id = si.product_id
            JOIN sales     s ON s.id = si.sale_id
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE s.tenant_id = ?
              AND s.status    = 'confirmed'
              AND DATE(s.confirmed_at) BETWEEN ? AND ?
            GROUP BY si.product_id, p.name, c.name
            ORDER BY revenue DESC
            LIMIT ?
        ", [$tenantId, $from, $to, $limit]);

        $data = collect($rows)->map(fn ($r) => [
            'product_id' => (int)   $r->product_id,
            'name'       => $r->name,
            'category'   => $r->category,
            'qty_sold'   => (float) $r->qty_sold,
            'revenue'    => (float) $r->revenue,
            'profit'     => (float) $r->profit,
        ])->all();

        if ($request->input('format') === 'csv') {
            return $this->csvResponse(
                filename: "top_produits_{$from}_{$to}.csv",
                headers:  ['Produit', 'Catégorie', 'Qté vendue', 'CA (FCFA)', 'Bénéfice (FCFA)'],
                rows:     array_map(
                    fn ($r) => [$r['name'], $r['category'] ?? '', $r['qty_sold'], $r['revenue'], $r['profit']],
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

        // Détail par produit (top 50 par activité)
        $rows = DB::select("
            SELECT
                sm.product_id,
                p.name,
                SUM(CASE WHEN sm.type = 'in'         THEN sm.quantity ELSE 0 END) AS total_in,
                SUM(CASE WHEN sm.type = 'out'        THEN sm.quantity ELSE 0 END) AS total_out,
                SUM(CASE WHEN sm.type = 'return'     THEN sm.quantity ELSE 0 END) AS total_return,
                SUM(CASE WHEN sm.type = 'adjustment' THEN sm.quantity ELSE 0 END) AS total_adjustment,
                p.stock_quantity AS current_stock
            FROM stock_movements sm
            JOIN products p ON p.id = sm.product_id
            WHERE sm.tenant_id = ?
              AND DATE(sm.created_at) BETWEEN ? AND ?
            GROUP BY sm.product_id, p.name, p.stock_quantity
            ORDER BY (SUM(CASE WHEN sm.type IN ('in','out') THEN sm.quantity ELSE 0 END)) DESC
            LIMIT 50
        ", [$tenantId, $from, $to]);

        $data = collect($rows)->map(fn ($r) => [
            'product_id'      => (int)   $r->product_id,
            'name'            => $r->name,
            'total_in'        => (float) $r->total_in,
            'total_out'       => (float) $r->total_out,
            'total_return'    => (float) $r->total_return,
            'total_adjustment'=> (float) $r->total_adjustment,
            'current_stock'   => (float) $r->current_stock,
        ])->all();

        if ($request->input('format') === 'csv') {
            return $this->csvResponse(
                filename: "stock_{$from}_{$to}.csv",
                headers:  ['Produit', 'Entrées', 'Sorties', 'Retours', 'Ajustements', 'Stock actuel'],
                rows:     array_map(
                    fn ($r) => [$r['name'], $r['total_in'], $r['total_out'], $r['total_return'], $r['total_adjustment'], $r['current_stock']],
                    $data
                ),
            );
        }

        return response()->json([
            'period'  => ['from' => $from, 'to' => $to],
            'summary' => [
                'total_in'         => $summary['in']         ?? 0,
                'total_out'        => $summary['out']        ?? 0,
                'total_return'     => $summary['return']     ?? 0,
                'total_adjustment' => $summary['adjustment'] ?? 0,
            ],
            'data' => $data,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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
