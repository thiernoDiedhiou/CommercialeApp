<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Product extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $appends = ['image_url'];

    protected $fillable = [
        'tenant_id',
        'category_id',
        'brand_id',
        'name',
        'slug',
        'description',
        'image_path',
        'sku',
        'barcode',
        'price',
        'cost_price',
        'has_variants',
        'is_weight_based',
        'has_expiry',
        'stock_quantity',
        'alert_threshold',
        'unit',
        'is_active',
    ];

    protected $casts = [
        'price'           => 'decimal:2',
        'cost_price'      => 'decimal:2',
        'has_variants'    => 'boolean',
        'is_weight_based' => 'boolean',
        'has_expiry'      => 'boolean',
        'is_active'       => 'boolean',
        'stock_quantity'  => 'float',
        'alert_threshold' => 'integer',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('id');
    }

    public function activeVariants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->where('is_active', true);
    }

    public function lots(): HasMany
    {
        return $this->hasMany(ProductLot::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class)->latest();
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeSimple(Builder $query): Builder
    {
        return $query->where('has_variants', false);
    }

    public function scopeWithVariants(Builder $query): Builder
    {
        return $query->where('has_variants', true);
    }

    public function scopeWeightBased(Builder $query): Builder
    {
        return $query->where('is_weight_based', true);
    }

    // Produits simples dont le stock est en dessous du seuil d'alerte
    public function scopeLowStock(Builder $query): Builder
    {
        return $query
            ->where('has_variants', false)
            ->whereRaw('stock_quantity <= alert_threshold')
            ->where('alert_threshold', '>', 0);
    }

    // ─── Accesseurs ───────────────────────────────────────────────────────────

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? Storage::disk('public')->url($this->image_path)
            : null;
    }

    // ─── Helpers sectoriels ───────────────────────────────────────────────────

    public function isLowStock(): bool
    {
        if ($this->has_variants) {
            return false;
        }

        return $this->alert_threshold > 0
            && $this->stock_quantity <= $this->alert_threshold;
    }

    public function isOutOfStock(): bool
    {
        return ! $this->has_variants && $this->stock_quantity <= 0;
    }

    // ─── Boot ─────────────────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Product $product) {
            if (empty($product->slug)) {
                $product->slug = Str::slug($product->name);
            }
        });
    }
}
