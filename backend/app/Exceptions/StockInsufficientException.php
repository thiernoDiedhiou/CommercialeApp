<?php

namespace App\Exceptions;

use App\Models\Product;
use App\Models\ProductVariant;
use RuntimeException;

class StockInsufficientException extends RuntimeException
{
    public function __construct(
        public readonly Product $product,
        public readonly ?ProductVariant $variant,
        public readonly float $requested,
        public readonly float $available,
    ) {
        $label = $variant
            ? "{$product->name} ({$variant->attribute_summary})"
            : $product->name;

        parent::__construct(
            "Stock insuffisant pour « {$label} » : {$available} disponible(s), {$requested} demandé(s)."
        );
    }

    public function toArray(): array
    {
        return [
            'message'           => $this->getMessage(),
            'code'              => 'STOCK_INSUFFICIENT',
            'product_id'        => $this->product->id,
            'product_variant_id'=> $this->variant?->id,
            'requested'         => $this->requested,
            'available'         => $this->available,
        ];
    }
}
