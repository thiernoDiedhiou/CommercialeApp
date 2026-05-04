<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(\App\Services\TenantService::class)->currentId();
        $userId   = $this->route('user')?->id;

        return [
            'name'      => ['sometimes', 'string', 'max:255'],
            'email'     => [
                'sometimes', 'email', 'max:191',
                "unique:users,email,{$userId},id,tenant_id,{$tenantId}",
            ],
            'password'  => ['sometimes', 'nullable', Password::min(8)->letters()->numbers()],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
