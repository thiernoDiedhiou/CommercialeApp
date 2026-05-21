<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __construct(private readonly TenantService $tenantService) {}

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
     */
    public function summary(): JsonResponse
    {
        $tenantId = $this->tenantService->currentId();

        // ── 1. Statistiques du jour ──────────────────────────────────────────
        // LEFT JOIN sale_items pour inclure les ventes sans items (edge case)
        $todayRow = DB::selectOne("
            SELECT
                COUNT(DISTINCT s.id)                                         AS sales_count,
                COALESCE(SUM(s.total), 0)                                    AS revenue,
                COALESCE(SUM(si.total - si.cost_price * si.quantity), 0)     AS profit
            FROM sales s
            LEFT JOIN sale_items si ON si.sale_id = s.id
            WHERE s.tenant_id  = ?
              AND s.status     = 'confirmed'
              AND DATE(s.confirmed_at) = CURDATE()
        ", [$tenantId]);

        // ── 2. Encaissements du jour par méthode ────────────────────────────
        $paymentRows = DB::select("
            SELECT p.method, COALESCE(SUM(p.amount), 0) AS total
            FROM payments p
            JOIN sales s ON s.id = p.sale_id
            WHERE s.tenant_id = ?
              AND s.status    = 'confirmed'
              AND DATE(s.confirmed_at) = CURDATE()
            GROUP BY p.method
        ", [$tenantId]);

        $paymentsByMethod = collect($paymentRows)->pluck('total', 'method')
            ->map(fn($v) => (float) $v)
            ->toArray();

        // ── 3. Graphique 7 jours glissants ──────────────────────────────────
        $weekRows = DB::select("
            SELECT
                DATE(s.confirmed_at)          AS date,
                COUNT(*)                      AS sales_count,
                COALESCE(SUM(s.total), 0)     AS revenue
            FROM sales s
            WHERE s.tenant_id  = ?
              AND s.status     = 'confirmed'
              AND s.confirmed_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(s.confirmed_at)
            ORDER BY date ASC
        ", [$tenantId]);

        // Remplissage des jours sans ventes avec 0 (7 jours garantis)
        $weekByDate = collect($weekRows)->keyBy('date');
        $weekChart  = [];
        for ($i = 6; $i >= 0; $i--) {
            $date        = now()->subDays($i)->toDateString();
            $row         = $weekByDate->get($date);
            $weekChart[] = [
                'date'        => $date,
                'sales_count' => $row ? (int)   $row->sales_count : 0,
                'revenue'     => $row ? (float) $row->revenue     : 0.0,
            ];
        }

        // ── [ajout] Montant en attente (factures envoyées/en retard) ────────
        $pendingRow = DB::selectOne("
            SELECT COALESCE(SUM(total - paid_amount), 0) AS pending_amount
            FROM invoices
            WHERE tenant_id = ? AND status IN ('sent', 'overdue')
        ", [$tenantId]);

        // ── 4. Top 5 produits du mois courant ───────────────────────────────
        $topProductRows = DB::select("
            SELECT
                si.product_id,
                p.name,
                SUM(si.quantity)          AS qty_sold,
                COALESCE(SUM(si.total), 0) AS revenue
            FROM sale_items si
            JOIN products p ON p.id   = si.product_id
            JOIN sales    s ON s.id   = si.sale_id
            WHERE s.tenant_id = ?
              AND s.status    = 'confirmed'
              AND s.confirmed_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
            GROUP BY si.product_id, p.name
            ORDER BY revenue DESC
            LIMIT 5
        ", [$tenantId]);

        // ── 5. Alertes de stock (UNION produits simples + variantes) ────────
        $stockAlertRows = DB::select("
            SELECT
                p.id   AS product_id,
                p.name,
                NULL   AS variant_id,
                NULL   AS variant,
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
                p.id  AS product_id,
                p.name,
                pv.id AS variant_id,
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
            LIMIT 20
        ", [$tenantId, $tenantId]);

        // ── 6. 5 dernières ventes confirmées ────────────────────────────────
        $recentSales = Sale::confirmed()
            ->with(['customer:id,name'])
            ->latest('confirmed_at')
            ->limit(5)
            ->get(['id', 'reference', 'customer_id', 'total', 'status', 'confirmed_at', 'created_at'])
            ->map(fn($s) => [
                'id'           => $s->id,
                'reference'    => $s->reference,
                'customer'     => $s->customer?->name,
                'total'        => (float) $s->total,
                'status'       => $s->status,
                'confirmed_at' => $s->confirmed_at,
                'created_at'   => $s->created_at,
            ]);

        // ── [Conditionnel] Lots expirant bientôt ────────────────────────────
        // Requête uniquement si le tenant utilise la traçabilité par lot/expiry.
        $expiringSoon = [];
        $hasExpiry    = Product::where('tenant_id', $tenantId)->where('has_expiry', true)->exists();

        if ($hasExpiry) {
            $days = (int) ($this->tenantService->setting('expiry_alert_days') ?? 30);

            $expiryRows = DB::select("
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
            ", [$tenantId, $days]);

            $expiringSoon = collect($expiryRows)->map(fn($r) => [
                'product_name'       => $r->product,
                'lot_number'         => $r->lot_number,
                'expiry_date'        => $r->expiry_date,
                'quantity_remaining' => (float) $r->qty_remaining,
                'days_remaining'     => (int)   $r->days_remaining,
            ])->all();
        }

        return response()->json([
            'today' => [
                'sales_count'    => (int)   ($todayRow->sales_count ?? 0),
                'revenue'        => (float) ($todayRow->revenue     ?? 0),
                'profit'         => (float) ($todayRow->profit      ?? 0),
                'pending_amount' => (float) ($pendingRow->pending_amount ?? 0),
            ],
            'by_payment_method' => $paymentsByMethod,
            'week_chart'        => $weekChart,
            'top_products'      => collect($topProductRows)->map(fn($r) => [
                'product_id'    => $r->product_id,
                'product_name'  => $r->name,
                'quantity_sold' => (float) $r->qty_sold,
                'revenue'       => (float) $r->revenue,
            ]),
            'stock_alerts'  => collect($stockAlertRows)->map(fn($r) => [
                'product_id'      => $r->product_id,
                'product_name'    => $r->name,
                'variant_id'      => $r->variant_id,
                'variant_summary' => $r->variant,
                'current_stock'   => (float) $r->current_stock,
                'threshold'       => (int)   $r->threshold,
            ]),
            'expiring_soon' => $expiringSoon,
            'recent_sales'  => $recentSales,
        ]);
    }
}
