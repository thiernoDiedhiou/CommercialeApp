<?php

namespace App\Http\Requests\Sale;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id'              => ['nullable', 'integer'],
            'discount_type'            => ['nullable', 'in:percent,fixed'],
            'discount_value'           => ['nullable', 'numeric', 'min:0'],
            'tax_amount'               => ['nullable', 'numeric', 'min:0'],
            'note'                     => ['nullable', 'string', 'max:500'],
            'offline_id'               => ['nullable', 'uuid'],

            'items'                    => ['required', 'array', 'min:1'],
            'items.*.product_id'       => ['required', 'integer'],
            'items.*.variant_id'       => ['nullable', 'integer'],
            'items.*.lot_id'           => ['nullable', 'integer'],
            'items.*.quantity'         => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_price'       => ['required', 'numeric', 'min:0'],
            'items.*.unit_weight'      => ['nullable', 'numeric', 'min:0'],
            'items.*.discount'         => ['nullable', 'numeric', 'min:0'],

            'payments'                 => ['required', 'array', 'min:1'],
            'payments.*.method'        => ['required', 'in:cash,card,transfer,mobile_money,credit'],
            'payments.*.amount'        => ['required', 'numeric', 'min:0.01'],
            'payments.*.reference'     => ['nullable', 'string', 'max:100'],
        ];
    }
}
