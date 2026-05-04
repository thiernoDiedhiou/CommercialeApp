<?php

namespace App\Http\Controllers\Product;

use App\Http\Controllers\Controller;
use App\Models\AttributeValue;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SaleItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VariantController extends Controller
{
    public function index(Product $product): JsonResponse
    {
        $variants = $product->variants()
            ->with('attributeValues.attribute')
            ->get();

        return response()->json(['data' => $variants]);
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'sku'                   => ['nullable', 'string', 'max:100'],
            'barcode'               => ['nullable', 'string', 'max:100'],
            'price'                 => ['nullable', 'numeric', 'min:0'],
            'cost_price'            => ['nullable', 'numeric', 'min:0'],
            'alert_threshold'       => ['nullable', 'integer', 'min:0'],
            'attribute_value_ids'   => ['required', 'array', 'min:1'],
            'attribute_value_ids.*' => ['integer'],
        ]);

        $valueIds = $data['attribute_value_ids'];
        $values   = AttributeValue::whereIn('id', $valueIds)->get();
        $summary  = $values->pluck('value')->join(' / ');

        $variant = DB::transaction(function () use ($product, $data, $valueIds, $summary) {
            $variant = ProductVariant::create([
                'product_id'        => $product->id,
                'sku'               => $data['sku'] ?? null,
                'barcode'           => $data['barcode'] ?? null,
                'price'             => $data['price'] ?? $product->price,
                'cost_price'        => $data['cost_price'] ?? $product->cost_price,
                'alert_threshold'   => $data['alert_threshold'] ?? null,
                'attribute_summary' => $summary,
                'stock_quantity'    => 0,
                'is_active'         => true,
            ]);

            $variant->attributeValues()->sync($valueIds);

            return $variant;
        });

        return response()->json(['data' => $variant->load('attributeValues.attribute')], 201);
    }

    public function update(Request $request, Product $product, ProductVariant $variant): JsonResponse
    {
        if ($variant->product_id !== $product->id) {
            return response()->json(['message' => 'Variante introuvable pour ce produit.'], 404);
        }

        $data = $request->validate([
            'sku'             => ['nullable', 'string', 'max:100'],
            'barcode'         => ['nullable', 'string', 'max:100'],
            'price'           => ['nullable', 'numeric', 'min:0'],
            'cost_price'      => ['nullable', 'numeric', 'min:0'],
            'alert_threshold' => ['nullable', 'integer', 'min:0'],
            'is_active'       => ['sometimes', 'boolean'],
        ]);

        $variant->update($data);

        return response()->json(['data' => $variant->fresh('attributeValues.attribute')]);
    }

    public function destroy(Request $request, Product $product, ProductVariant $variant): JsonResponse
    {
        if ($variant->product_id !== $product->id) {
            return response()->json(['message' => 'Variante introuvable pour ce produit.'], 404);
        }

        if (SaleItem::where('variant_id', $variant->id)->exists()) {
            // Désactivation — conserve l'historique des ventes
            $variant->update(['is_active' => false]);
            return response()->json(['message' => 'Variante désactivée (historique de ventes conservé).']);
        }

        $variant->delete();
        return response()->json(null, 204);
    }
}
