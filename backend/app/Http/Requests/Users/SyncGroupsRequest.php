<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;

class SyncGroupsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'group_ids'   => ['required', 'array'],
            'group_ids.*' => ['integer', 'exists:groups,id'],
        ];
    }
}
