<?php

namespace App\Http\Requests\Groups;

use App\Services\TenantService;
use Illuminate\Foundation\Http\FormRequest;

class StoreGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantService::class)->currentId();

        return [
            'name' => [
                'required', 'string', 'max:100',
                "unique:groups,name,NULL,id,tenant_id,{$tenantId}",
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'permission_ids' => ['sometimes', 'array'],
            'permission_ids.*' => ['integer', 'exists:permissions,id'],
        ];
    }
}
