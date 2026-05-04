<?php

namespace App\Http\Controllers\Product;

use App\Http\Controllers\Controller;
use App\Models\AttributeValue;
use App\Models\ProductAttribute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AttributeController extends Controller
{
    public function index(): JsonResponse
    {
        $attributes = ProductAttribute::with(['values' => function ($q) {
            $q->orderBy('sort_order')->orderBy('value');
        }])
        ->orderBy('sort_order')
        ->orderBy('name')
        ->get();

        return response()->json(['data' => $attributes]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:100'],
            'slug'       => ['nullable', 'string', 'max:100', 'alpha_dash'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);

        $attribute = ProductAttribute::create($data);

        return response()->json(['data' => $attribute->load('values')], 201);
    }

    public function destroy(ProductAttribute $attribute): JsonResponse
    {
        // Vérifier si des variantes utilisent des valeurs de cet attribut
        $usedInVariants = $attribute->values()->whereHas('variants')->exists();

        if ($usedInVariants) {
            return response()->json([
                'message' => 'Impossible de supprimer un attribut utilisé dans des variantes.',
                'code'    => 'ATTRIBUTE_IN_USE',
            ], 422);
        }

        $attribute->delete();
        return response()->json(null, 204);
    }

    public function storeValue(Request $request, ProductAttribute $attribute): JsonResponse
    {
        $data = $request->validate([
            'value'      => ['required', 'string', 'max:100'],
            'slug'       => ['nullable', 'string', 'max:100', 'alpha_dash'],
            'color_hex'  => ['nullable', 'string', 'max:7', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $data['slug'] = $data['slug'] ?? Str::slug($data['value']);

        $value = $attribute->values()->create($data);

        return response()->json(['data' => $value], 201);
    }

    public function destroyValue(ProductAttribute $attribute, AttributeValue $value): JsonResponse
    {
        if ($value->product_attribute_id !== $attribute->id) {
            return response()->json(['message' => 'Valeur introuvable pour cet attribut.'], 404);
        }

        if ($value->variants()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer une valeur utilisée dans des variantes.',
                'code'    => 'VALUE_IN_USE',
            ], 422);
        }

        $value->delete();
        return response()->json(null, 204);
    }
}
