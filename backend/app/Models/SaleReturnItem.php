<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleReturnItem extends Model
{
    protected $fillable = [
        'sale_return_id',
        'sale_item_id',
        'product_id',
        'product_variant_id',
        'lot_id',
        'quantity',
        'unit_weight',
        'unit_price',
        'total',
    ];

    protected $casts = [
        'quantity'    => 'decimal:3',
        'unit_weight' => 'decimal:3',
        'unit_price'  => 'decimal:2',
        'total'       => 'decimal:2',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function saleReturn(): BelongsTo
    {
        return $this->belongsTo(SaleReturn::class);
    }

    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(ProductLot::class, 'lot_id');
    }
}
