<?php

namespace App\Http\Controllers\Invoice;

use App\Http\Controllers\Controller;
use App\Http\Requests\Invoice\RecordPaymentRequest;
use App\Http\Requests\Invoice\StoreInvoiceRequest;
use App\Http\Requests\Invoice\UpdateInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Jobs\SendInvoiceEmailJob;
use App\Jobs\SendInvoiceReminderJob;
use App\Models\Invoice;
use App\Services\InvoiceService;
use App\Services\MailService;
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
        private readonly MailService $mailService,
    ) {}

    // ── Liste ─────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $invoices = Invoice::with(['customer:id,name', 'user:id,name'])
            ->withCount('items')
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->customer_id, fn ($q) => $q->where('customer_id', $request->customer_id))
            ->when($request->search, fn ($q) => $q->where(function ($q2) use ($request) {
                $q2->where('reference', 'like', "%{$request->search}%")
                    ->orWhereHas('customer', fn ($q3) => $q3->where('name', 'like', "%{$request->search}%"));
            }))
            ->when($request->from, fn ($q) => $q->whereDate('issue_date', '>=', $request->from))
            ->when($request->to, fn ($q) => $q->whereDate('issue_date', '<=', $request->to))
            ->orderByDesc('id')
            ->paginate(20);

        $invoices->setCollection(
            $invoices->getCollection()->map(fn ($i) => (new InvoiceResource($i))->toArray(request()))
        );

        return response()->json($invoices);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        $invoice = $this->invoiceService->create($request->validated());

        return response()->json(['data' => new InvoiceResource($invoice)], 201);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        $invoice->load(array_merge(self::EAGER_LOAD, ['payments.user:id,name', 'creditNoteFor:id,uid,reference', 'convertedTo:id,uid,reference']));

        return response()->json(['data' => new InvoiceResource($invoice)]);
    }

    public function update(UpdateInvoiceRequest $request, Invoice $invoice): JsonResponse
    {
        try {
            $invoice = $this->invoiceService->update($invoice, $request->validated());
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => new InvoiceResource($invoice)]);
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        if (! $invoice->isDraft()) {
            return response()->json(['message' => 'Seules les factures en statut "draft" peuvent être supprimées.'], 422);
        }

        $invoice->delete();

        return response()->json(null, 204);
    }

    // ── Actions métier ────────────────────────────────────────────────────────

    public function send(Request $request, Invoice $invoice): JsonResponse
    {
        try {
            $invoice = $this->invoiceService->send($invoice);
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $invoice->loadMissing('customer');

        // Email personnalisé ou auto si email client présent — dispatché en queue (évite timeout PDF)
        $email = $request->input('email') ?? $invoice->customer?->email;
        $subject = $request->input('subject');
        $message = $request->input('message');

        if ($email) {
            SendInvoiceEmailJob::dispatch($invoice, $email, $subject, $message)
                ->onQueue('notifications');
        }

        return response()->json(['data' => new InvoiceResource($invoice)]);
    }

    public function sendReminder(Invoice $invoice): JsonResponse
    {
        if (! in_array($invoice->status, [Invoice::STATUS_SENT, Invoice::STATUS_OVERDUE])) {
            return response()->json(['message' => 'Les relances ne s\'appliquent qu\'aux factures envoyées ou en retard.'], 422);
        }

        $invoice->loadMissing('customer');

        if (! $invoice->customer?->email) {
            return response()->json(['message' => 'Ce client n\'a pas d\'adresse email enregistrée.'], 422);
        }

        $invoice = $this->invoiceService->incrementReminder($invoice);
        SendInvoiceReminderJob::dispatch($invoice)->onQueue('notifications');

        return response()->json(['data' => new InvoiceResource($invoice)]);
    }

    public function recordPayment(RecordPaymentRequest $request, Invoice $invoice): JsonResponse
    {
        try {
            $validated = $request->validated();
            $amount = (float) $validated['amount'];
            $extra = [
                'method' => $validated['method'] ?? 'cash',
                'paid_at' => $validated['paid_at'] ?? null,
                'reference' => $validated['reference'] ?? null,
                'note' => $validated['note'] ?? null,
            ];
            $invoice = $this->invoiceService->recordPayment($invoice, $amount, $extra);
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => new InvoiceResource($invoice)]);
    }

    public function payments(Invoice $invoice): JsonResponse
    {
        $payments = $invoice->payments()->with('user:id,name')->orderByDesc('paid_at')->get();

        return response()->json(['data' => $payments]);
    }

    public function duplicate(Invoice $invoice): JsonResponse
    {
        $copy = $this->invoiceService->duplicate($invoice);

        return response()->json(['data' => new InvoiceResource($copy)], 201);
    }

    public function convertToInvoice(Invoice $invoice): JsonResponse
    {
        try {
            $newInvoice = $this->invoiceService->convertToInvoice($invoice);
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => new InvoiceResource($newInvoice)], 201);
    }

    public function createCreditNote(Invoice $invoice): JsonResponse
    {
        try {
            $creditNote = $this->invoiceService->createCreditNote($invoice);
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => new InvoiceResource($creditNote)], 201);
    }

    public function cancel(Invoice $invoice): JsonResponse
    {
        try {
            $invoice = $this->invoiceService->cancel($invoice);
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => new InvoiceResource($invoice)]);
    }

    // ── PDF ───────────────────────────────────────────────────────────────────

    public function pdf(Invoice $invoice): Response
    {
        $invoice->load(array_merge(self::EAGER_LOAD, ['creditNoteFor:id,reference']));

        $tenant = $this->tenantService->current();
        $footer = $invoice->footer
            ?? $this->tenantService->setting('invoice_footer')
            ?? 'Merci de votre confiance';
        $template = $invoice->pdf_template
            ?? $this->tenantService->setting('pdf_template')
            ?? 'classic';

        // pdf.invoice_doc gère à la fois 'classic' et 'moderne' via $template
        $view = 'pdf.invoice_doc';
        $pdf = Pdf::loadView($view, compact('invoice', 'tenant', 'footer', 'template'));

        $filename = match (true) {
            $invoice->isCreditNote() => "avoir-{$invoice->reference}.pdf",
            $invoice->type === Invoice::TYPE_QUOTE => "devis-{$invoice->reference}.pdf",
            default => "facture-{$invoice->reference}.pdf",
        };

        return $pdf->stream($filename);
    }
}
