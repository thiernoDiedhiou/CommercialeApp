<?php

namespace App\Http\Requests\Stock;

use App\Models\Product;
use App\Models\ProductLot;
use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer'],
            'variant_id' => ['nullable', 'integer'],
            'lot_id'     => ['nullable', 'integer'],
            'type'       => ['required', Rule::in(['in', 'out', 'adjustment'])],
            // numeric sans min pour autoriser les valeurs négatives (adjustment)
            'quantity'   => ['required', 'numeric'],
            'note'       => ['nullable', 'string', 'max:500'],
            'unit_cost'  => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $tenantId  = auth()->user()->tenant_id;
            $productId = $this->input('product_id');
            $variantId = $this->input('variant_id');
            $lotId     = $this->input('lot_id');
            $type      = $this->input('type');
            $quantity  = (float) $this->input('quantity');

            // ── 1. Produit appartient au tenant ──────────────────────────────
            $product = Product::where('id', $productId)
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->first();

            if (! $product) {
                $validator->errors()->add('product_id', 'Produit introuvable pour ce tenant.');
                return;
            }

            // ── 2. Variante appartient au produit (protection traversal) ─────
            if ($variantId) {
                $variantExists = ProductVariant::where('id', $variantId)
                    ->where('product_id', $product->id)
                    ->exists();

                if (! $variantExists) {
                    $validator->errors()->add('variant_id', 'La variante n\'appartient pas à ce produit.');
                    return;
                }
            }

            // ── 3. Lot appartient au produit/variante ────────────────────────
            if ($lotId) {
                $lotExists = ProductLot::where('id', $lotId)
                    ->where('product_id', $product->id)
                    ->when($variantId, fn($q) => $q->where('product_variant_id', $variantId))
                    ->exists();

                if (! $lotExists) {
                    $validator->errors()->add('lot_id', 'Le lot n\'appartient pas à ce produit/variante.');
                }
            }

            // ── 4. Quantité > 0 pour in/out ──────────────────────────────────
            if ($type !== 'adjustment' && $quantity <= 0) {
                $validator->errors()->add(
                    'quantity',
                    "La quantité doit être strictement positive pour le type \"{$type}\"."
                );
            }
        });
    }
}
