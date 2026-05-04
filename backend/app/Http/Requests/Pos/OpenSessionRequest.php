<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class OpenSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'opening_cash' => ['nullable', 'numeric', 'min:0'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ];
    }
}
