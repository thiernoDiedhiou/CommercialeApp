<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;

class ImportProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Accepte .csv (text/csv ou text/plain selon l'OS)
            'file'            => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
            // Si true : met à jour les produits dont le SKU existe déjà
            'update_existing' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Un fichier CSV est requis.',
            'file.mimes'    => 'Le fichier doit être au format CSV (.csv).',
            'file.max'      => 'Le fichier ne doit pas dépasser 2 Mo.',
        ];
    }
}
