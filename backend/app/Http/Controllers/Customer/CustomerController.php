<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Models\Customer;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $customers = Customer::when($request->search, fn($q) => $q->search($request->search))
            ->when($request->has('is_active'), fn($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate(20);

        return response()->json($customers);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $customer = Customer::create($request->validated());

        return response()->json(['data' => $customer], 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        $stats = Sale::confirmed()
            ->where('customer_id', $customer->id)
            ->selectRaw('COUNT(*) as sales_count, COALESCE(SUM(total), 0) as total_purchases, MAX(confirmed_at) as last_purchase_at')
            ->first();

        // Créances : ventes confirmées non soldées
        $unpaidSales = Sale::confirmed()
            ->where('customer_id', $customer->id)
            ->withSum('payments', 'amount')
            ->get()
            ->filter(fn($s) => (float) $s->total > (float) ($s->payments_sum_amount ?? 0));

        $outstandingBalance = $unpaidSales->sum(
            fn($s) => bcsub((string) $s->total, (string) ($s->payments_sum_amount ?? 0), 2)
        );

        return response()->json([
            'data' => array_merge($customer->toArray(), [
                'sales_count'         => (int) $stats->sales_count,
                'total_purchases'     => (float) $stats->total_purchases,
                'last_purchase_at'    => $stats->last_purchase_at,
                'outstanding_balance' => (float) $outstandingBalance,
                'unpaid_sales_count'  => $unpaidSales->count(),
            ]),
        ]);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $customer->update($request->validated());

        return response()->json(['data' => $customer->fresh()]);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        if ($customer->sales()->exists()) {
            // Désactivation — le client a un historique de ventes
            $customer->update(['is_active' => false]);
            return response()->json(['message' => 'Client désactivé (historique de ventes conservé).']);
        }

        $customer->delete();
        return response()->json(null, 204);
    }

    public function sales(Request $request, Customer $customer): JsonResponse
    {
        $sales = Sale::where('customer_id', $customer->id)
            ->with(['user:id,name'])
            ->withCount('items')
            ->withSum('payments', 'amount')
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->latest('id')
            ->paginate(20);

        return response()->json($sales);
    }
}
