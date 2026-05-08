<?php

namespace App\Http\Controllers\Sale;

use App\Exceptions\SaleException;
use App\Exceptions\StockInsufficientException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sale\StorePaymentRequest;
use App\Http\Requests\Sale\StoreSaleRequest;
use App\Models\Sale;
use App\Services\SaleService;
use App\Services\TenantService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SaleController extends Controller
{
    private const EAGER_LOAD = ['customer', 'user', 'items.product', 'items.variant', 'items.lot', 'payments'];

    public function __construct(
        private readonly SaleService $saleService,
        private readonly TenantService $tenantService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $sales = Sale::with(['customer:id,name', 'user:id,name'])
            ->withCount('items')
            ->withSum('payments', 'amount')
            ->when($request->search, fn($q) => $q->where(function ($inner) use ($request) {
                $inner->where('reference', 'like', "%{$request->search}%")
                      ->orWhereHas('customer', fn($c) => $c->where('name', 'like', "%{$request->search}%"));
            }))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->customer_id, fn($q) => $q->where('customer_id', $request->customer_id))
            ->when($request->user_id, fn($q) => $q->where('user_id', $request->user_id))
            ->when($request->from && $request->to, fn($q) => $q->forPeriod($request->from, $request->to))
            ->latest('id')
            ->paginate(20);

        return response()->json($sales);
    }

    public function store(StoreSaleRequest $request): JsonResponse
    {
        try {
            $sale = $this->saleService->create($request->validated(), $request->user());

            return response()->json(['data' => $sale], 201);
        } catch (StockInsufficientException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'STOCK_INSUFFICIENT'], 422);
        } catch (SaleException $e) {
            return response()->json($e->toArray(), 422);
        }
    }

    public function show(Sale $sale): JsonResponse
    {
        $sale->load(self::EAGER_LOAD);

        return response()->json(['data' => $sale]);
    }

    public function addPayment(StorePaymentRequest $request, Sale $sale): JsonResponse
    {
        try {
            $payment = $this->saleService->addPayment(
                sale:      $sale,
                method:    $request->input('method'),
                amount:    (float) $request->input('amount'),
                reference: $request->input('reference'),
            );

            return response()->json(['data' => $payment], 201);
        } catch (SaleException $e) {
            return response()->json($e->toArray(), 422);
        }
    }

    public function cancel(Sale $sale): JsonResponse
    {
        try {
            $sale = $this->saleService->cancel($sale);

            return response()->json(['data' => $sale]);
        } catch (SaleException $e) {
            return response()->json($e->toArray(), 422);
        }
    }

    public function pdf(Sale $sale): Response
    {
        $sale->load(self::EAGER_LOAD);

        $tenant = $this->tenantService->current();
        $footer = $this->tenantService->setting('receipt_footer') ?? 'Merci de votre confiance';

        $pdf = Pdf::loadView('pdf.invoice', compact('sale', 'tenant', 'footer'));

        return $pdf->stream("facture-{$sale->reference}.pdf");
    }
}
