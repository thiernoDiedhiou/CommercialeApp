<?php

namespace App\Http\Controllers\Category;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Http\Requests\Category\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::with(['children' => function ($q) {
            $q->withCount('products')->orderBy('name');
        }])
        ->withCount('products')
        ->whereNull('parent_id')
        ->orderBy('name')
        ->get();

        return response()->json(['data' => $categories]);
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $data         = $request->validated();
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('categories', 'public');
        }

        unset($data['remove_image']);
        $category = Category::create($data);

        return response()->json(['data' => $category], 201);
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['name']) && ! isset($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        if ($request->hasFile('image')) {
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }
            $data['image'] = $request->file('image')->store('categories', 'public');
        } elseif (! empty($data['remove_image'])) {
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }
            $data['image'] = null;
        } else {
            unset($data['image']);
        }

        unset($data['remove_image']);
        $category->update($data);

        return response()->json(['data' => $category->fresh()]);
    }

    public function destroy(Category $category): JsonResponse
    {
        if ($category->products()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer une catégorie contenant des produits.',
                'code'    => 'CATEGORY_HAS_PRODUCTS',
            ], 422);
        }

        // Remonter les enfants au niveau du parent de la catégorie supprimée
        $category->children()->update(['parent_id' => $category->parent_id]);

        if ($category->image) {
            Storage::disk('public')->delete($category->image);
        }

        $category->delete();

        return response()->json(null, 204);
    }
}
