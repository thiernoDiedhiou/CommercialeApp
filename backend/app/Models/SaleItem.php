<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// SaleItem n'a pas de tenant_id — il est scoped par sale_id.
// Pas de BelongsToTenant : l'isolation est garantie par la relation Sale.
class SaleItem extends Model
{
    protected $fillable = [
        'sale_id',
        'product_id',
        'variant_id',
        'lot_id',
        'quantity',
        'unit_weight',
        'unit_price',
        'cost_price',
        'discount',
        'total',
    ];

    protected $casts = [
        'quantity'    => 'float',
        'unit_weight' => 'float',
        'unit_price'  => 'decimal:2',
        'cost_price'  => 'decimal:2',
        'discount'    => 'decimal:2',
        'total'       => 'decimal:2',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(ProductLot::class, 'lot_id');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    // Label lisible pour l'affichage (facture, reçu)
    public function label(): string
    {
        $name = $this->product->name ?? 'Produit inconnu';

        if ($this->variant?->attribute_summary) {
            return "{$name} — {$this->variant->attribute_summary}";
        }

        return $name;
    }
}
