<?php

namespace App\Http\Controllers\Purchase;

use App\Http\Controllers\Controller;
use App\Http\Requests\Purchase\ReceivePurchaseOrderRequest;
use App\Http\Requests\Purchase\StorePurchaseOrderRequest;
use App\Http\Requests\Purchase\UpdatePurchaseOrderRequest;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Services\PurchaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;

class PurchaseOrderController extends Controller
{
    public function __construct(private readonly PurchaseService $purchaseService) {}

    public function index(Request $request): JsonResponse
    {
        $orders = PurchaseOrder::with(['supplier:id,name', 'user:id,name'])
            ->withCount('items')
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->supplier_id, fn ($q) => $q->where('supplier_id', $request->supplier_id))
            ->when($request->search, fn ($q) => $q->where('reference', 'like', "%{$request->search}%"))
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json($orders);
    }

    public function store(StorePurchaseOrderRequest $request): JsonResponse
    {
        $order = $this->purchaseService->create($request->validated());

        return response()->json(['data' => $order], 201);
    }

    public function show(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $purchaseOrder->load(['supplier:id,name', 'user:id,name', 'items.product:id,name,unit,has_expiry', 'items.variant:id,attribute_summary']);

        return response()->json(['data' => $purchaseOrder]);
    }

    public function update(UpdatePurchaseOrderRequest $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        if (! $purchaseOrder->isDraft()) {
            return response()->json(['message' => 'Seuls les bons en statut "draft" peuvent être modifiés.'], 422);
        }

        $data = $request->validated();

        $purchaseOrder->update([
            'supplier_id' => array_key_exists('supplier_id', $data) ? $data['supplier_id'] : $purchaseOrder->supplier_id,
            'expected_at' => $data['expected_at'] ?? $purchaseOrder->expected_at,
            'notes'       => array_key_exists('notes', $data) ? $data['notes'] : $purchaseOrder->notes,
        ]);

        // Remplacement complet des lignes si items fournis
        if (isset($data['items'])) {
            $purchaseOrder->items()->delete();
            foreach ($data['items'] as $item) {
                PurchaseOrderItem::create([
                    'purchase_order_id'  => $purchaseOrder->id,
                    'product_id'         => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'quantity_ordered'   => $item['quantity_ordered'],
                    'quantity_received'  => 0,
                    'unit_cost'          => $item['unit_cost'],
                ]);
            }
        }

        return response()->json(['data' => $purchaseOrder->fresh(['supplier', 'items.product', 'items.variant'])]);
    }

    public function destroy(PurchaseOrder $purchaseOrder): JsonResponse
    {
        if (! $purchaseOrder->isDraft()) {
            return response()->json(['message' => 'Seuls les bons en statut "draft" peuvent être supprimés.'], 422);
        }

        $purchaseOrder->delete();

        return response()->json(null, 204);
    }

    public function confirm(PurchaseOrder $purchaseOrder): JsonResponse
    {
        try {
            $order = $this->purchaseService->confirm($purchaseOrder);
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $order]);
    }

    public function receive(ReceivePurchaseOrderRequest $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        try {
            $order = $this->purchaseService->receive($purchaseOrder, $request->validated()['receptions']);
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $order]);
    }

    public function cancel(PurchaseOrder $purchaseOrder): JsonResponse
    {
        try {
            $order = $this->purchaseService->cancel($purchaseOrder);
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $order]);
    }
}
