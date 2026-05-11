<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DebtController extends Controller
{
    public function __construct(private readonly TenantService $tenantService) {}

    /**
     * Liste paginée des clients ayant un solde impayé sur leurs ventes confirmées,
     * triée par montant dû décroissant.
     *
     * Chaque ligne : id, name, phone, email, unpaid_sales_count, outstanding_balance
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId  = $this->tenantService->currentId();
        $search    = $request->string('search')->trim()->toString();
        $page      = max(1, (int) $request->input('page', 1));
        $perPage   = 20;

        // Sous-requête : total encaissé par vente
        $paidSubquery = "
            SELECT sale_id, COALESCE(SUM(amount), 0) AS paid
            FROM payments
            GROUP BY sale_id
        ";

        $searchBind  = [];
        $searchWhere = '';
        if ($search !== '') {
            $searchWhere = " AND (c.name LIKE ? OR c.phone LIKE ?)";
            $searchBind  = ["%{$search}%", "%{$search}%"];
        }

        $rows = DB::select("
            SELECT
                c.id,
                c.name,
                c.phone,
                c.email,
                COUNT(DISTINCT CASE WHEN s.total > COALESCE(p.paid, 0) THEN s.id END)    AS unpaid_sales_count,
                SUM(GREATEST(s.total - COALESCE(p.paid, 0), 0))                           AS outstanding_balance
            FROM customers c
            INNER JOIN sales s ON s.customer_id = c.id AND s.tenant_id = ? AND s.status = 'confirmed'
            LEFT JOIN ({$paidSubquery}) p ON p.sale_id = s.id
            WHERE c.tenant_id = ?
            {$searchWhere}
            GROUP BY c.id, c.name, c.phone, c.email
            HAVING SUM(GREATEST(s.total - COALESCE(p.paid, 0), 0)) > 0
            ORDER BY outstanding_balance DESC
        ", [$tenantId, $tenantId, ...$searchBind]);

        // Pagination manuelle
        $total  = count($rows);
        $offset = ($page - 1) * $perPage;
        $items  = array_slice($rows, $offset, $perPage);

        return response()->json([
            'data'         => array_map(fn($r) => [
                'id'                  => $r->id,
                'name'                => $r->name,
                'phone'               => $r->phone,
                'email'               => $r->email,
                'unpaid_sales_count'  => (int) $r->unpaid_sales_count,
                'outstanding_balance' => (float) $r->outstanding_balance,
            ], $items),
            'total'        => $total,
            'current_page' => $page,
            'last_page'    => max(1, (int) ceil($total / $perPage)),
            'per_page'     => $perPage,
        ]);
    }
}
