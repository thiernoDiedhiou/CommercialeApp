<?php

namespace App\Http\Requests\Invoice;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StoreInvoiceRequest extends FormRequest
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
            'customer_id'         => ['nullable', 'integer', Rule::exists('customers', 'id')->where('tenant_id', $tenantId)],
            'issue_date'          => ['required', 'date'],
            'due_date'            => ['nullable', 'date', 'after_or_equal:issue_date'],
            'discount_type'       => ['nullable', Rule::in(['percent', 'fixed'])],
            'discount_value'      => ['nullable', 'numeric', 'min:0'],
            'tax_rate'            => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes'               => ['nullable', 'string'],
            'footer'              => ['nullable', 'string'],

            'items'               => ['required', 'array', 'min:1'],
            'items.*.product_id'  => ['nullable', 'integer', Rule::exists('products', 'id')->where('tenant_id', $tenantId)->whereNull('deleted_at')],
            'items.*.description' => ['required', 'string', 'max:500'],
            'items.*.quantity'    => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_price'  => ['required', 'numeric', 'min:0'],
            'items.*.discount'    => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
