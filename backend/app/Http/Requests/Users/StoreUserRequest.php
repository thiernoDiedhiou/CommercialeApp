<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(\App\Services\TenantService::class)->currentId();

        return [
            'name'      => ['required', 'string', 'max:255'],
            'email'     => [
                'required', 'email', 'max:191',
                // Email unique dans le scope du tenant courant
                "unique:users,email,NULL,id,tenant_id,{$tenantId}",
            ],
            'password'  => ['required', Password::min(8)->letters()->numbers()],
            'is_active' => ['sometimes', 'boolean'],
            'group_ids' => ['sometimes', 'array'],
            'group_ids.*' => ['integer', 'exists:groups,id'],
        ];
    }
}
