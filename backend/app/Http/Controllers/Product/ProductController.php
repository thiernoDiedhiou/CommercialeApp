<?php

namespace App\Http\Controllers\Product;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\BranchStock;
use App\Models\Product;
use App\Models\SaleItem;
use App\Services\ActivityLogService;
use App\Services\BranchService;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function __construct(
        private readonly ProductService $productService,
        private readonly BranchService $branchService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $products = Product::with(['category:id,name', 'brand:id,name'])
            ->withCount('variants')
            ->when($request->search, fn ($q) => $q->where(function ($inner) use ($request) {
                $inner->where('name', 'like', "%{$request->search}%")
                    ->orWhere('sku', 'like', "%{$request->search}%")
                    ->orWhere('barcode', '=', $request->search);
            }))
            ->when($request->category_id, fn ($q) => $q->where('category_id', $request->category_id))
            ->when($request->has('has_variants'), fn ($q) => $q->where('has_variants', $request->boolean('has_variants')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate(20);

        // Substitue stock_quantity par le stock de la succursale active
        $branchId = $this->branchService->currentId();
        if ($branchId !== null) {
            $productIds = $products->pluck('id')->all();
            $branchStocksMap = BranchStock::where('branch_id', $branchId)
                ->whereIn('product_id', $productIds)
                ->where('product_variant_id', 0)
                ->get()
                ->keyBy('product_id');

            foreach ($products as $product) {
                $product->stock_quantity = (float) ($branchStocksMap->get($product->id)?->quantity ?? 0);
            }
        }

        $products->setCollection(
            $products->getCollection()->map(fn ($p) => (new ProductResource($p))->toArray(request()))
        );

        return response()->json($products);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (array_key_exists('unit', $data) && $data['unit'] === null) {
            $data['unit'] = '';
        }

        if (array_key_exists('alert_threshold', $data) && $data['alert_threshold'] === null) {
            $data['alert_threshold'] = 5;
        }

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('products', 'public');
        }

        $product = $this->productService->create($data);
        $product->load(['category:id,name', 'brand:id,name']);

        return response()->json(['data' => new ProductResource($product)], 201);
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['category:id,name', 'brand:id,name', 'variants.attributeValues.attribute']);

        // Substitue stock_quantity par le stock de la succursale active
        $branchId = $this->branchService->currentId();
        if ($branchId !== null) {
            $variantIds = $product->variants->pluck('id')->all();

            $productRow = BranchStock::where('branch_id', $branchId)
                ->where('product_id', $product->id)
                ->where('product_variant_id', 0)
                ->value('quantity');
            $product->stock_quantity = (float) ($productRow ?? 0);

            if (! empty($variantIds)) {
                $variantMap = BranchStock::where('branch_id', $branchId)
                    ->whereIn('product_variant_id', $variantIds)
                    ->get()
                    ->keyBy('product_variant_id');
                foreach ($product->variants as $variant) {
                    $variant->stock_quantity = (float) ($variantMap->get($variant->id)?->quantity ?? 0);
                }
            }
        }

        return response()->json(['data' => new ProductResource($product)]);
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $data = $request->validated();

        // unit et alert_threshold sont NOT NULL en base
        if (array_key_exists('unit', $data) && $data['unit'] === null) {
            $data['unit'] = '';
        }

        if (array_key_exists('alert_threshold', $data) && $data['alert_threshold'] === null) {
            $data['alert_threshold'] = 5;
        }

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $data['image_path'] = $request->file('image')->store('products', 'public');
        } elseif ($request->boolean('remove_image') && $product->image_path) {
            Storage::disk('public')->delete($product->image_path);
            $data['image_path'] = null;
        }

        $product = $this->productService->update($product, $data);
        $product->load(['category:id,name', 'brand:id,name']);

        return response()->json(['data' => new ProductResource($product)]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $name = $product->name;

        if (SaleItem::where('product_id', $product->id)->exists()) {
            $product->delete();
            ActivityLogService::log('delete', 'products', 'Produit "'.$name.'" archivé');

            return response()->json(['message' => 'Produit archivé (historique de ventes conservé).']);
        }

        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->forceDelete();
        ActivityLogService::log('delete', 'products', 'Produit "'.$name.'" supprimé');

        return response()->json(null, 204);
    }

    public function stockMovements(Request $request, Product $product): JsonResponse
    {
        $movements = $product->stockMovements()
            ->with(['variant:id,attribute_summary'])
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->paginate(30);

        return response()->json($movements);
    }
}
