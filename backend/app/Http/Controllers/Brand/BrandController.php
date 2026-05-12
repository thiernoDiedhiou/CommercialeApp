<?php

namespace App\Http\Controllers\Brand;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    public function index(): JsonResponse
    {
        $brands = Brand::orderBy('name')->get();

        return response()->json(['data' => $brands]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('brands')->where('tenant_id', $request->user()->tenant_id)],
        ]);

        $brand = Brand::create($data);

        return response()->json(['data' => $brand], 201);
    }

    public function update(Request $request, Brand $brand): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('brands')->where('tenant_id', $request->user()->tenant_id)->ignore($brand->id)],
        ]);

        $brand->update($data);

        return response()->json(['data' => $brand->fresh()]);
    }

    public function destroy(Brand $brand): JsonResponse
    {
        if ($brand->products()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer une marque associée à des produits.',
                'code'    => 'BRAND_HAS_PRODUCTS',
            ], 422);
        }

        $brand->delete();

        return response()->json(null, 204);
    }
}
