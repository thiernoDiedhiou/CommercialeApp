<?php

namespace App\Http\Controllers\Product;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductImageController extends Controller
{
    private const MAX_IMAGES = 10;

    public function __construct(private readonly TenantService $tenantService) {}

    /** POST /products/{product}/images */
    public function store(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpeg,png,webp', 'max:2048'],
        ]);

        $count = $product->images()->count();
        if ($count >= self::MAX_IMAGES) {
            return response()->json([
                'message' => "Maximum ".self::MAX_IMAGES." images par produit.",
                'error'   => 'MAX_IMAGES_REACHED',
            ], 422);
        }

        $path = $request->file('image')->store('products', 'public');

        $image = ProductImage::create([
            'tenant_id'  => $this->tenantService->currentId(),
            'product_id' => $product->id,
            'disk_path'  => $path,
            'sort_order' => $count,  // placé en dernière position
        ]);

        return response()->json([
            'data' => [
                'uid'        => $image->uid,
                'url'        => $image->url,
                'sort_order' => $image->sort_order,
            ],
        ], 201);
    }

    /** DELETE /products/{product}/images/{image} */
    public function destroy(Product $product, ProductImage $image): JsonResponse
    {
        // Vérifie que l'image appartient bien à ce produit
        if ($image->product_id !== $product->id) {
            return response()->json(['message' => 'Image introuvable.'], 404);
        }

        Storage::disk('public')->delete($image->disk_path);
        $image->delete();

        // Réindexe sort_order pour supprimer les trous
        $product->images()->orderBy('sort_order')->get()
            ->each(function (ProductImage $img, int $i): void {
                $img->update(['sort_order' => $i]);
            });

        return response()->json(['message' => 'Image supprimée.']);
    }

    /** PUT /products/{product}/images/reorder */
    public function reorder(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'uids'   => ['required', 'array'],
            'uids.*' => ['required', 'string'],
        ]);

        $uids = $request->input('uids');

        $images = $product->images()->whereIn('uid', $uids)->get()->keyBy('uid');

        if ($images->count() !== count($uids)) {
            return response()->json(['message' => 'UIDs invalides.'], 422);
        }

        foreach ($uids as $i => $uid) {
            $images[$uid]->update(['sort_order' => $i]);
        }

        return response()->json(['message' => 'Ordre mis à jour.']);
    }
}
