<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Propaganistas\LaravelPhone\Rules\Phone;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var \App\Models\User $user */
        $user       = Auth::user();
        $tenantId   = $user->tenant_id;
        $customerId = $this->route('customer')?->id;

        return [
            'name'      => ['sometimes', 'string', 'max:100'],
            'country'   => ['nullable', 'string', 'size:2'],
            'phone'     => ['nullable', 'string', 'max:30',
                            Rule::unique('customers')->where('tenant_id', $tenantId)->ignore($customerId),
                            (new Phone)->countryField('country')],
            'email'     => ['nullable', 'email', 'max:150',
                            Rule::unique('customers')->where('tenant_id', $tenantId)->ignore($customerId)],
            'address'   => ['nullable', 'string', 'max:255'],
            'notes'     => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.phone' => 'Le numéro de téléphone est invalide pour le pays sélectionné.',
        ];
    }
}
