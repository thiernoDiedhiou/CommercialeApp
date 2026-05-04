<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'sku',
        'barcode',
        'price',
        'cost_price',
        'stock_quantity',
        'alert_threshold',
        'attribute_summary',
        'is_active',
    ];

    protected $casts = [
        'price'           => 'decimal:2',
        'cost_price'      => 'decimal:2',
        'stock_quantity'  => 'float',
        'alert_threshold' => 'integer',
        'is_active'       => 'boolean',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Les valeurs d'attribut de cette variante.
     * Ex: [Taille → M, Couleur → Rouge]
     *
     * Le TenantScope s'applique sur attribute_values (WHERE tenant_id = ?)
     * mais pas sur le pivot product_variant_attribute_values (pas de tenant_id).
     */
    public function attributeValues(): BelongsToMany
    {
        return $this->belongsToMany(
            AttributeValue::class,
            'product_variant_attribute_values',
            'product_variant_id',
            'attribute_value_id'
        );
    }

    public function lots(): HasMany
    {
        return $this->hasMany(ProductLot::class, 'product_variant_id');
    }

    public function activeLots(): HasMany
    {
        return $this->hasMany(ProductLot::class, 'product_variant_id')
            ->where('is_active', true)
            ->where('quantity_remaining', '>', 0)
            ->orderBy('expiry_date');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'product_variant_id')->latest();
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function effectiveAlertThreshold(): int
    {
        return $this->alert_threshold ?? $this->product->alert_threshold;
    }

    public function isLowStock(): bool
    {
        $threshold = $this->effectiveAlertThreshold();

        return $threshold > 0 && $this->stock_quantity <= $threshold;
    }

    public function isOutOfStock(): bool
    {
        return $this->stock_quantity <= 0;
    }
}
