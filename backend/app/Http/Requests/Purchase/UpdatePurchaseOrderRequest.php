<?php

namespace App\Http\Requests\Purchase;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UpdatePurchaseOrderRequest extends FormRequest
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
            'supplier_id'                  => ['nullable', 'integer', Rule::exists('suppliers', 'id')->where('tenant_id', $tenantId)->whereNull('deleted_at')],
            'expected_at'                  => ['nullable', 'date'],
            'notes'                        => ['nullable', 'string'],

            'items'                        => ['sometimes', 'array', 'min:1'],
            'items.*.product_id'           => ['required_with:items', 'integer', Rule::exists('products', 'id')->where('tenant_id', $tenantId)->whereNull('deleted_at')],
            'items.*.product_variant_id'   => ['nullable', 'integer', function ($attribute, $value, $fail) use ($tenantId) {
                if ($value === null) return;
                $exists = DB::table('product_variants')
                    ->join('products', 'products.id', '=', 'product_variants.product_id')
                    ->where('product_variants.id', $value)
                    ->where('products.tenant_id', $tenantId)
                    ->whereNull('products.deleted_at')
                    ->exists();
                if (! $exists) {
                    $fail('La variante sélectionnée est invalide ou appartient à un autre compte.');
                }
            }],
            'items.*.quantity_ordered'     => ['required_with:items', 'numeric', 'min:0.001'],
            'items.*.unit_cost'            => ['required_with:items', 'numeric', 'min:0'],
        ];
    }
}
