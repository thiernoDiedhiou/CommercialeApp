<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId   = auth()->user()->tenant_id;
        $customerId = $this->route('customer')?->id;

        return [
            'name'      => ['sometimes', 'string', 'max:100'],
            'phone'     => ['nullable', 'string', 'max:30', Rule::unique('customers')->where('tenant_id', $tenantId)->ignore($customerId)],
            'email'     => ['nullable', 'email', 'max:150', Rule::unique('customers')->where('tenant_id', $tenantId)->ignore($customerId)],
            'address'   => ['nullable', 'string', 'max:255'],
            'notes'     => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
