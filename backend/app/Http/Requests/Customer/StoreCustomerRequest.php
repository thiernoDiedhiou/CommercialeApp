<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = auth()->user()->tenant_id;

        return [
            'name'    => ['required', 'string', 'max:100'],
            'phone'   => ['nullable', 'string', 'max:30', Rule::unique('customers')->where('tenant_id', $tenantId)],
            'email'   => ['nullable', 'email', 'max:150', Rule::unique('customers')->where('tenant_id', $tenantId)],
            'address' => ['nullable', 'string', 'max:255'],
            'notes'   => ['nullable', 'string', 'max:500'],
        ];
    }
}
