<?php

namespace App\Http\Requests\Purchase;

use Illuminate\Foundation\Http\FormRequest;
use Propaganistas\LaravelPhone\Rules\Phone;

class StoreSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'max:200'],
            'country'   => ['nullable', 'string', 'size:2'],
            'phone'     => ['nullable', 'string', 'max:30', (new Phone)->countryField('country')],
            'email'     => ['nullable', 'email', 'max:191'],
            'address'   => ['nullable', 'string'],
            'notes'     => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.phone' => 'Le numéro de téléphone est invalide pour le pays sélectionné.',
        ];
    }
}
