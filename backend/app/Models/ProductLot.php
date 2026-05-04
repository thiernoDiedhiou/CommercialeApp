<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductLot extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'product_variant_id',
        'lot_number',
        'expiry_date',
        'quantity_received',
        'quantity_remaining',
        'purchase_price',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'expiry_date'         => 'date',
        'quantity_received'   => 'integer',
        'quantity_remaining'  => 'integer',
        'purchase_price'      => 'decimal:2',
        'is_active'           => 'boolean',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'lot_id')->latest();
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeAvailable($query)
    {
        return $query->active()->where('quantity_remaining', '>', 0);
    }

    // Lots dont la date d'expiration est dans les N prochains jours
    public function scopeExpiringWithinDays($query, int $days)
    {
        return $query
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '>', now())
            ->where('expiry_date', '<=', now()->addDays($days));
    }

    public function scopeExpired($query)
    {
        return $query
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<', now()->toDateString());
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isExpired(): bool
    {
        return $this->expiry_date !== null
            && $this->expiry_date->isPast();
    }

    public function isExpiringWithinDays(int $days): bool
    {
        return $this->expiry_date !== null
            && ! $this->isExpired()
            && $this->expiry_date->lte(now()->addDays($days));
    }

    public function isEmpty(): bool
    {
        return $this->quantity_remaining <= 0;
    }

    public function isAvailable(): bool
    {
        return $this->is_active
            && ! $this->isEmpty()
            && ! $this->isExpired();
    }
}
