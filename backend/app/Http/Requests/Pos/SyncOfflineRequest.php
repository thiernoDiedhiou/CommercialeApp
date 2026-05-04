<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class SyncOfflineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sales'                        => ['required', 'array', 'min:1', 'max:100'],
            'sales.*.offline_id'           => ['required', 'uuid'],
            'sales.*.customer_id'          => ['nullable', 'integer'],
            'sales.*.discount_type'        => ['nullable', 'in:percent,fixed'],
            'sales.*.discount_value'       => ['nullable', 'numeric', 'min:0'],
            'sales.*.tax_amount'           => ['nullable', 'numeric', 'min:0'],
            'sales.*.note'                 => ['nullable', 'string', 'max:500'],
            'sales.*.items'                => ['required', 'array', 'min:1'],
            'sales.*.items.*.product_id'   => ['required', 'integer'],
            'sales.*.items.*.variant_id'   => ['nullable', 'integer'],
            'sales.*.items.*.quantity'     => ['required', 'numeric', 'min:0.001'],
            'sales.*.items.*.unit_price'   => ['required', 'numeric', 'min:0'],
            'sales.*.items.*.discount'     => ['nullable', 'numeric', 'min:0'],
            'sales.*.payments'             => ['required', 'array', 'min:1'],
            'sales.*.payments.*.method'    => ['required', 'in:cash,card,transfer,mobile_money,credit'],
            'sales.*.payments.*.amount'    => ['required', 'numeric', 'min:0.01'],
            'sales.*.payments.*.reference' => ['nullable', 'string', 'max:100'],
        ];
    }
}
