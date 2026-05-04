<?php

namespace App\Http\Controllers\Product;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Product;
use App\Models\SaleItem;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(private readonly ProductService $productService) {}

    public function index(Request $request): JsonResponse
    {
        $products = Product::with(['category:id,name'])
            ->withCount('variants')
            ->when($request->search, fn($q) => $q->where(function ($inner) use ($request) {
                $inner->where('name', 'like', "%{$request->search}%")
                      ->orWhere('sku', 'like', "%{$request->search}%")
                      ->orWhere('barcode', '=', $request->search);
            }))
            ->when($request->category_id, fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->has('has_variants'), fn($q) => $q->where('has_variants', $request->boolean('has_variants')))
            ->when($request->has('is_active'), fn($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate(20);

        return response()->json($products);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->create($request->validated());

        return response()->json(['data' => $product], 201);
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['category:id,name', 'variants.attributeValues.attribute']);

        return response()->json(['data' => $product]);
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $product = $this->productService->update($product, $request->validated());

        return response()->json(['data' => $product]);
    }

    public function destroy(Product $product): JsonResponse
    {
        if (SaleItem::where('product_id', $product->id)->exists()) {
            // Soft delete — conserve l'historique des ventes
            $product->delete();
            return response()->json(['message' => 'Produit archivé (historique de ventes conservé).']);
        }

        // Pas de ventes → suppression définitive (variants en cascade)
        $product->forceDelete();
        return response()->json(null, 204);
    }

    public function stockMovements(Request $request, Product $product): JsonResponse
    {
        $movements = $product->stockMovements()
            ->with(['variant:id,attribute_summary'])
            ->when($request->type, fn($q) => $q->where('type', $request->type))
            ->paginate(30);

        return response()->json($movements);
    }
}
