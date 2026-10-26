<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DebtController extends Controller
{
    public function __construct(private readonly TenantService $tenantService) {}

    /**
     * Liste paginée des clients ayant un solde impayé, avec ancienneté et tri.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->tenantService->currentId();
        $search = $request->string('search')->trim()->toString();
        $sort = $request->input('sort', 'amount_desc');
        $page = max(1, (int) $request->input('page', 1));
        $perPage = 20;
        $offset = ($page - 1) * $perPage;

        $paidSubquery = '
            SELECT sale_id, COALESCE(SUM(amount), 0) AS paid
            FROM payments
            GROUP BY sale_id
        ';

        $searchBind = [];
        $searchWhere = '';
        if ($search !== '') {
            $searchWhere = ' AND (c.name LIKE ? OR c.phone LIKE ?)';
            $searchBind = ["%{$search}%", "%{$search}%"];
        }

        $baseQuery = "
            FROM customers c
            INNER JOIN sales s ON s.customer_id = c.id AND s.tenant_id = ? AND s.status = 'confirmed'
            LEFT JOIN ({$paidSubquery}) p ON p.sale_id = s.id
            WHERE c.tenant_id = ?
            {$searchWhere}
            GROUP BY c.id, c.uid, c.name, c.phone, c.email
            HAVING SUM(GREATEST(s.total - COALESCE(p.paid, 0), 0)) > 0
        ";

        $baseBindings = [$tenantId, $tenantId, ...$searchBind];

        $orderBy = match ($sort) {
            'name_asc' => 'c.name ASC',
            'name_desc' => 'c.name DESC',
            'oldest_first' => 'oldest_debt_date ASC',
            'amount_asc' => 'outstanding_balance ASC',
            default => 'outstanding_balance DESC',
        };

        $totalsRow = DB::selectOne("
            SELECT COUNT(*) AS total, COALESCE(SUM(sub.outstanding_balance), 0) AS global_outstanding
            FROM (
                SELECT c.id, SUM(GREATEST(s.total - COALESCE(p.paid, 0), 0)) AS outstanding_balance
                {$baseQuery}
            ) sub
        ", $baseBindings);

        $total = (int) $totalsRow->total;
        $globalOutstanding = (float) $totalsRow->global_outstanding;

        $rows = DB::select("
            SELECT
                c.id,
                c.uid,
                c.name,
                c.phone,
                c.email,
                COUNT(DISTINCT CASE WHEN s.total > COALESCE(p.paid, 0) THEN s.id END) AS unpaid_sales_count,
                SUM(GREATEST(s.total - COALESCE(p.paid, 0), 0))                        AS outstanding_balance,
                MIN(COALESCE(s.confirmed_at, s.created_at))                            AS oldest_debt_date
            {$baseQuery}
            ORDER BY {$orderBy}
            LIMIT ? OFFSET ?
        ", [...$baseBindings, $perPage, $offset]);

        return response()->json([
            'data' => array_map(fn ($r) => [
                'uid' => $r->uid,
                'name' => $r->name,
                'phone' => $r->phone,
                'email' => $r->email,
                'unpaid_sales_count' => (int) $r->unpaid_sales_count,
                'outstanding_balance' => (float) $r->outstanding_balance,
                'oldest_debt_date' => $r->oldest_debt_date,
            ], $rows),
            'total' => $total,
            'current_page' => $page,
            'last_page' => max(1, (int) ceil($total / $perPage)),
            'per_page' => $perPage,
            'global_outstanding' => $globalOutstanding,
        ]);
    }

    /**
     * Détail d'un débiteur : liste des ventes impayées/partielles.
     */
    public function show(Customer $customer): JsonResponse
    {
        $tenantId = $this->tenantService->currentId();

        if ($customer->tenant_id !== $tenantId) {
            abort(404);
        }

        $sales = DB::select("
            SELECT
                s.uid,
                s.reference,
                s.total,
                COALESCE(p.paid, 0)                              AS paid_amount,
                GREATEST(s.total - COALESCE(p.paid, 0), 0)      AS remaining,
                COALESCE(s.confirmed_at, s.created_at)           AS sale_date
            FROM sales s
            LEFT JOIN (
                SELECT sale_id, COALESCE(SUM(amount), 0) AS paid
                FROM payments
                GROUP BY sale_id
            ) p ON p.sale_id = s.id
            WHERE s.customer_id = ?
              AND s.tenant_id   = ?
              AND s.status      = 'confirmed'
              AND GREATEST(s.total - COALESCE(p.paid, 0), 0) > 0
            ORDER BY sale_date ASC
        ", [$customer->id, $tenantId]);

        $totalOutstanding = array_sum(array_map(fn ($s) => (float) $s->remaining, $sales));

        return response()->json([
            'customer' => [
                'uid' => $customer->uid,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
            ],
            'sales' => array_map(fn ($s) => [
                'uid' => $s->uid,
                'reference' => $s->reference,
                'sale_date' => $s->sale_date,
                'total' => (float) $s->total,
                'paid_amount' => (float) $s->paid_amount,
                'remaining' => (float) $s->remaining,
            ], $sales),
            'total_outstanding' => $totalOutstanding,
            'unpaid_count' => count($sales),
        ]);
    }
}
