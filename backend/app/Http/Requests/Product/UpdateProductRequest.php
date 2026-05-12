<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var \App\Models\User $user */
        $user      = Auth::user();
        $tenantId  = $user->tenant_id;
        $productId = $this->route('product')?->id;

        return [
            'category_id'     => ['nullable', 'integer', Rule::exists('categories', 'id')->where('tenant_id', $tenantId)],
            'brand_id'        => ['nullable', 'integer', Rule::exists('brands', 'id')->where('tenant_id', $tenantId)],
            'name'            => ['sometimes', 'string', 'max:200'],
            'description'     => ['nullable', 'string'],
            'image'           => ['nullable', 'mimes:jpeg,png,webp', 'max:2048'],
            'remove_image'    => ['boolean'],
            'sku'             => ['nullable', 'string', 'max:100', Rule::unique('products')->where('tenant_id', $tenantId)->whereNull('deleted_at')->ignore($productId)],
            'barcode'         => ['nullable', 'string', 'max:100', Rule::unique('products')->where('tenant_id', $tenantId)->whereNull('deleted_at')->ignore($productId)],
            'price'           => ['sometimes', 'numeric', 'min:0'],
            'cost_price'      => ['nullable', 'numeric', 'min:0'],
            'is_weight_based' => ['sometimes', 'boolean'],
            'has_expiry'      => ['sometimes', 'boolean'],
            'stock_quantity'  => ['nullable', 'numeric', 'min:0'],
            'alert_threshold' => ['nullable', 'integer', 'min:0'],
            'unit'            => ['nullable', 'string', 'max:20'],
            'is_active'       => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            // Cohérence unité ↔ is_weight_based (si les deux sont envoyés)
            $product       = $this->route('product');
            $isWeightBased = $this->has('is_weight_based')
                ? $this->boolean('is_weight_based')
                : $product?->is_weight_based;

            if ($isWeightBased && $this->has('unit')) {
                $unit = $this->input('unit');
                if ($unit !== null && ! in_array($unit, ['kg', 'g', 'l', 'ml'], true)) {
                    $validator->errors()->add('unit', 'L\'unité doit être kg, g, l ou ml pour un produit vendu au poids.');
                }
            }
        });
    }
}
