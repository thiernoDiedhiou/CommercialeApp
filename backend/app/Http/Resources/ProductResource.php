<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            // TODO: retirer 'id' une fois le frontend migré pour n'utiliser que 'uid'
            'id' => $this->id,
            'uid' => $this->uid,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'image_url' => $this->image_url,   // accesseur — jamais image_path
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'price' => $this->price,
            'compare_at_price' => $this->compare_at_price,
            'cost_price' => $this->cost_price,
            'has_variants' => $this->has_variants,
            'is_weight_based' => $this->is_weight_based,
            'has_expiry' => $this->has_expiry,
            'stock_quantity' => $this->stock_quantity,
            'alert_threshold' => $this->alert_threshold,
            'unit' => $this->unit,
            'is_active' => $this->is_active,
            'is_for_sale' => $this->is_for_sale,
            // Agrégats optionnels (whenLoaded/whenAppended)
            'variants_count' => $this->when(isset($this->variants_count), $this->variants_count),
            // Relations eager-loaded
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'uid' => $this->category->uid,
                'name' => $this->category->name,
            ]),
            'brand' => $this->whenLoaded('brand', fn () => [
                'id' => $this->brand->id,
                'uid' => $this->brand->uid,
                'name' => $this->brand->name,
            ]),
            'variants' => $this->whenLoaded('variants', fn () => ProductVariantResource::collection($this->variants)
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
