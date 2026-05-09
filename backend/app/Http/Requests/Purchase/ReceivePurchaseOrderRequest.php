<?php

namespace App\Http\Requests\Purchase;

use Illuminate\Foundation\Http\FormRequest;

class ReceivePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'receptions'                      => ['required', 'array', 'min:1'],
            'receptions.*.id'                 => ['required', 'integer'],
            'receptions.*.quantity_received'  => ['required', 'numeric', 'min:0'],
            'receptions.*.lot_number'         => ['nullable', 'string', 'max:100'],
            'receptions.*.expiry_date'        => ['nullable', 'date', 'after:today'],
        ];
    }
}
