<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uid' => $this->uid,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'attribute_summary' => $this->attribute_summary,
            'price' => $this->price,
            'cost_price' => $this->cost_price,
            'stock_quantity' => $this->stock_quantity,
            'alert_threshold' => $this->alert_threshold,
            'is_active' => $this->is_active,
            'attribute_values' => $this->whenLoaded('attributeValues', fn () => $this->attributeValues->map(fn ($v) => [
                'id' => $v->id,
                'value' => $v->value,
                'attribute_id' => $v->product_attribute_id,
            ])
            ),
        ];
    }
}
