<?php

namespace App\Http\Controllers\Product;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductLot;
use App\Services\StockService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductLotController extends Controller
{
    public function __construct(
        private readonly TenantService $tenantService,
        private readonly StockService $stockService,
    ) {}

    public function index(Product $product): JsonResponse
    {
        $lots = ProductLot::where('product_id', $product->id)
            ->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END')
            ->orderBy('expiry_date')
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $lots]);
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'lot_number'         => ['required', 'string', 'max:100'],
            'expiry_date'        => ['nullable', 'date'],
            'quantity'           => ['required', 'integer', 'min:1'],
            'purchase_price'     => ['nullable', 'numeric', 'min:0'],
            'notes'              => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($data, $product) {
            $existing = ProductLot::where('tenant_id', $this->tenantService->currentId())
                ->where('product_id', $product->id)
                ->where('product_variant_id', $data['product_variant_id'] ?? null)
                ->where('lot_number', $data['lot_number'])
                ->first();

            if ($existing) {
                return response()->json(['message' => "Le lot {$data['lot_number']} existe déjà pour ce produit."], 422);
            }

            $variant = null;
            if (! empty($data['product_variant_id'])) {
                $variant = $product->variants()->findOrFail($data['product_variant_id']);
            }

            $lot = ProductLot::create([
                'tenant_id'          => $this->tenantService->currentId(),
                'product_id'         => $product->id,
                'product_variant_id' => $data['product_variant_id'] ?? null,
                'lot_number'         => $data['lot_number'],
                'expiry_date'        => $data['expiry_date'] ?? null,
                'quantity_received'  => $data['quantity'],
                'quantity_remaining' => 0, // StockService::adjust() incrémentera via updateLotQuantity()
                'purchase_price'     => $data['purchase_price'] ?? null,
                'is_active'          => true,
                'notes'              => $data['notes'] ?? null,
            ]);

            $this->stockService->adjust(
                product:  $product,
                type:     'in',
                quantity: $data['quantity'],
                source:   'lot_manual',
                sourceId: $lot->id,
                variant:  $variant,
                unitCost: $data['purchase_price'] ?? null,
                notes:    "Lot {$lot->lot_number}",
                lot:      $lot,
            );

            return response()->json(['data' => $lot], 201);
        });
    }

    public function update(Request $request, Product $product, ProductLot $lot): JsonResponse
    {
        if ($lot->product_id !== $product->id) {
            return response()->json(['message' => 'Lot introuvable pour ce produit.'], 404);
        }

        $data = $request->validate([
            'expiry_date'    => ['nullable', 'date'],
            'is_active'      => ['boolean'],
            'notes'          => ['nullable', 'string', 'max:500'],
        ]);

        $lot->update($data);

        return response()->json(['data' => $lot]);
    }

    /**
     * Régularise le stock orphelin (stock_quantity - sum(lots.quantity_remaining)).
     * Crée un lot sans mouvement de stock supplémentaire — le stock_quantity ne change pas.
     */
    public function regularize(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'lot_number'  => ['nullable', 'string', 'max:100'],
            'expiry_date' => ['nullable', 'date'],
            'notes'       => ['nullable', 'string', 'max:500'],
        ]);

        $lotTotal = ProductLot::where('product_id', $product->id)->sum('quantity_remaining');
        $orphaned = (int) $product->stock_quantity - (int) $lotTotal;

        if ($orphaned <= 0) {
            return response()->json(['message' => 'Aucun stock orphelin à régulariser.'], 422);
        }

        $lotNumber = $data['lot_number'] ?? ('REG-' . now()->format('Ymd'));

        $existing = ProductLot::where('product_id', $product->id)
            ->where('lot_number', $lotNumber)
            ->first();

        if ($existing) {
            return response()->json(['message' => "Le lot {$lotNumber} existe déjà. Choisissez un autre numéro."], 422);
        }

        $lot = ProductLot::create([
            'tenant_id'          => $this->tenantService->currentId(),
            'product_id'         => $product->id,
            'product_variant_id' => null,
            'lot_number'         => $lotNumber,
            'expiry_date'        => $data['expiry_date'] ?? null,
            'quantity_received'  => $orphaned,
            'quantity_remaining' => $orphaned,
            'is_active'          => true,
            'notes'              => $data['notes'] ?? 'Régularisation stock existant',
        ]);

        return response()->json(['data' => $lot, 'orphaned_absorbed' => $orphaned], 201);
    }
}
