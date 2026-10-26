<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\InventorySession;
use App\Services\InventoryService;
use App\Services\TenantService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InventoryController extends Controller
{
    public function __construct(private readonly InventoryService $service) {}

    // ─── GET /api/v1/stock/inventories ────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $sessions = InventorySession::with(['creator:id,name'])
            ->withCount('items')
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json($sessions);
    }

    // ─── POST /api/v1/stock/inventories ───────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        $session = $this->service->create(
            user: $request->user(),
            notes: $request->input('notes'),
        );

        return response()->json(['data' => $session], 201);
    }

    // ─── GET /api/v1/stock/inventories/{uid} ─────────────────────────────────

    public function show(InventorySession $inventorySession): JsonResponse
    {
        return response()->json([
            'data' => $inventorySession->load(['creator:id,name', 'confirmer:id,name']),
        ]);
    }

    // ─── GET /api/v1/stock/inventories/{uid}/lines ────────────────────────────

    public function lines(Request $request, InventorySession $inventorySession): JsonResponse
    {
        $inventorySession->load('items');

        $lines = $this->service->lines(
            session: $inventorySession,
            search: $request->input('search'),
            categoryId: $request->integer('category_id') ?: null,
        );

        return response()->json(['data' => $lines]);
    }

    // ─── PUT /api/v1/stock/inventories/{uid}/items ────────────────────────────

    public function updateItem(Request $request, InventorySession $inventorySession): JsonResponse
    {
        if ($inventorySession->status !== 'draft') {
            return response()->json(['message' => 'Cet inventaire est déjà confirmé.'], 422);
        }

        $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'variant_id' => 'nullable|integer|exists:product_variants,id',
            'expected_qty' => 'required|numeric|min:0',
            'counted_qty' => 'required|numeric|min:0',
        ]);

        $item = $this->service->saveItem(
            session: $inventorySession,
            productId: $request->integer('product_id'),
            variantId: $request->integer('variant_id') ?: null,
            expectedQty: (float) $request->input('expected_qty'),
            countedQty: (float) $request->input('counted_qty'),
        );

        return response()->json(['data' => $item]);
    }

    // ─── POST /api/v1/stock/inventories/{uid}/confirm ─────────────────────────

    public function confirm(InventorySession $inventorySession, Request $request): JsonResponse
    {
        try {
            $session = $this->service->confirm($inventorySession, $request->user());
        } catch (\LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $session]);
    }

    // ─── GET /api/v1/stock/inventories/{uid}/export-csv ──────────────────────

    public function exportCsv(InventorySession $inventorySession): Response
    {
        $csv = $this->service->exportCsv($inventorySession);
        $filename = "{$inventorySession->reference}.csv";

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // ─── GET /api/v1/stock/inventories/{uid}/export-pdf ──────────────────────

    public function exportPdf(InventorySession $inventorySession): Response
    {
        $inventorySession->load(['creator:id,name', 'confirmer:id,name', 'items.product.category', 'items.variant']);

        $tenant = app(TenantService::class)->current();

        $pdf = Pdf::loadView('pdf.inventory', [
            'session' => $inventorySession,
            'tenant' => $tenant,
        ])->setPaper('a4', 'portrait');

        $filename = "{$inventorySession->reference}.pdf";

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // ─── DELETE /api/v1/stock/inventories/{uid} ───────────────────────────────

    public function destroy(InventorySession $inventorySession): JsonResponse
    {
        if ($inventorySession->status === 'confirmed') {
            return response()->json(['message' => 'Impossible de supprimer un inventaire confirmé.'], 422);
        }

        $inventorySession->delete();

        return response()->json(['message' => 'Inventaire supprimé.']);
    }
}
