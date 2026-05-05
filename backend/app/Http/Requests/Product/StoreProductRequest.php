<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var \App\Models\User $user */
        $user     = Auth::user();
        $tenantId = $user->tenant_id;

        return [
            'category_id'           => ['nullable', 'integer', Rule::exists('categories', 'id')->where('tenant_id', $tenantId)],
            'name'                  => ['required', 'string', 'max:200'],
            'description'           => ['nullable', 'string'],
            'image'                 => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:2048'],
            'sku'                   => ['nullable', 'string', 'max:100', Rule::unique('products')->where('tenant_id', $tenantId)->whereNull('deleted_at')],
            'barcode'               => ['nullable', 'string', 'max:100', Rule::unique('products')->where('tenant_id', $tenantId)->whereNull('deleted_at')],
            'price'                 => ['required', 'numeric', 'min:0'],
            'cost_price'            => ['nullable', 'numeric', 'min:0'],
            'has_variants'          => ['boolean'],
            'is_weight_based'       => ['boolean'],
            'has_expiry'            => ['boolean'],
            'stock_quantity'        => ['nullable', 'numeric', 'min:0'],
            'alert_threshold'       => ['nullable', 'integer', 'min:0'],
            'unit'                  => ['nullable', 'string', 'max:20'],
            'is_active'             => ['boolean'],

            // Variantes — requis si has_variants, scopées au tenant pour sécurité
            'attribute_value_ids'   => ['array'],
            'attribute_value_ids.*' => ['integer', Rule::exists('attribute_values', 'id')->where('tenant_id', $tenantId)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            // has_variants → au moins une valeur d'attribut requise
            if ($this->boolean('has_variants') && empty($this->input('attribute_value_ids'))) {
                $validator->errors()->add(
                    'attribute_value_ids',
                    'Les valeurs d\'attribut sont requises pour un produit avec variantes.'
                );
            }

            // is_weight_based → unité de poids ou volume obligatoire
            if ($this->boolean('is_weight_based')) {
                $unit = $this->input('unit');
                if (! in_array($unit, ['kg', 'g', 'l', 'ml'], true)) {
                    $validator->errors()->add('unit', 'L\'unité doit être kg, g, l ou ml pour un produit vendu au poids.');
                }
            }
        });
    }
}
