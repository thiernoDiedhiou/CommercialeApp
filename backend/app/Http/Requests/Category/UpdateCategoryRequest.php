<?php

namespace App\Http\Requests\Category;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId   = auth()->user()->tenant_id;
        $categoryId = $this->route('category')?->id;

        return [
            'name'        => ['sometimes', 'string', 'max:100'],
            'slug'        => ['nullable', 'string', 'max:100', 'alpha_dash', Rule::unique('categories')->where('tenant_id', $tenantId)->ignore($categoryId)],
            'parent_id'   => ['nullable', 'integer', Rule::exists('categories', 'id')->where('tenant_id', $tenantId)],
            'description' => ['nullable', 'string', 'max:1000'],
            'image'       => ['nullable', 'image', 'max:2048'],
            'remove_image' => ['nullable', 'boolean'],
        ];
    }
}
