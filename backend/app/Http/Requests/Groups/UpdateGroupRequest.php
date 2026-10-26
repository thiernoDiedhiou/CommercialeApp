<?php

namespace App\Http\Requests\Groups;

use App\Services\TenantService;
use Illuminate\Foundation\Http\FormRequest;

class UpdateGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantService::class)->currentId();
        $groupId = $this->route('group')?->id;

        return [
            'name' => [
                'sometimes', 'string', 'max:100',
                "unique:groups,name,{$groupId},id,tenant_id,{$tenantId}",
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
