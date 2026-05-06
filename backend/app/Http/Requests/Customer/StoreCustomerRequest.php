<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Propaganistas\LaravelPhone\Rules\Phone;

class StoreCustomerRequest extends FormRequest
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
            'name'    => ['required', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'size:2'],
            'phone'   => ['nullable', 'string', 'max:30',
                          Rule::unique('customers')->where('tenant_id', $tenantId),
                          (new Phone)->countryField('country')],
            'email'   => ['nullable', 'email', 'max:150',
                          Rule::unique('customers')->where('tenant_id', $tenantId)],
            'address' => ['nullable', 'string', 'max:255'],
            'notes'   => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.phone' => 'Le numéro de téléphone est invalide pour le pays sélectionné.',
        ];
    }
}
