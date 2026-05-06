<?php

namespace App\Http\Controllers\Invoice;

use App\Http\Controllers\Controller;
use App\Http\Requests\Invoice\RecordPaymentRequest;
use App\Http\Requests\Invoice\StoreInvoiceRequest;
use App\Http\Requests\Invoice\UpdateInvoiceRequest;
use App\Models\Invoice;
use App\Services\InvoiceService;
use App\Services\TenantService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use LogicException;

class InvoiceController extends Controller
{
    private const EAGER_LOAD = ['customer:id,name,phone,email,address', 'user:id,name', 'items.product:id,name,unit'];

    public function __construct(
        private readonly InvoiceService $invoiceService,
        private readonly TenantService $tenantService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $invoices = Invoice::with(['customer:id,name', 'user:id,name'])
            ->withCount('items')
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->customer_id, fn ($q) => $q->where('customer_id', $request->customer_id))
            ->when($request->search, fn ($q) => $q->where('reference', 'like', "%{$request->search}%"))
            ->when($request->from, fn ($q) => $q->whereDate('issue_date', '>=', $request->from))
            ->when($request->to, fn ($q) => $q->whereDate('issue_date', '<=', $request->to))
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json($invoices);
    }

    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        $invoice = $this->invoiceService->create($request->validated());

        return response()->json(['data' => $invoice], 201);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        $invoice->load(self::EAGER_LOAD);

        return response()->json(['data' => $invoice]);
    }

    public function update(UpdateInvoiceRequest $request, Invoice $invoice): JsonResponse
    {
        try {
            $invoice = $this->invoiceService->update($invoice, $request->validated());
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $invoice]);
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        if (! $invoice->isDraft()) {
            return response()->json(['message' => 'Seules les factures en statut "draft" peuvent être supprimées.'], 422);
        }

        $invoice->delete();

        return response()->json(null, 204);
    }

    public function send(Invoice $invoice): JsonResponse
    {
        try {
            $invoice = $this->invoiceService->send($invoice);
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $invoice]);
    }

    public function recordPayment(RecordPaymentRequest $request, Invoice $invoice): JsonResponse
    {
        try {
            $invoice = $this->invoiceService->recordPayment($invoice, (float) $request->validated()['amount']);
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $invoice]);
    }

    public function cancel(Invoice $invoice): JsonResponse
    {
        try {
            $invoice = $this->invoiceService->cancel($invoice);
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $invoice]);
    }

    public function pdf(Invoice $invoice): Response
    {
        $invoice->load(self::EAGER_LOAD);

        $tenant = $this->tenantService->current();
        $footer = $invoice->footer
            ?? $this->tenantService->setting('invoice_footer')
            ?? 'Merci de votre confiance';

        $pdf = Pdf::loadView('pdf.invoice_doc', compact('invoice', 'tenant', 'footer'));

        return $pdf->stream("facture-{$invoice->reference}.pdf");
    }
}
