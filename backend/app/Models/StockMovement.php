<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class StockMovement extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'product_variant_id',
        'lot_id',
        'type',
        'quantity',
        'stock_before',
        'stock_after',
        'source',
        'source_id',
        'unit_cost',
        'user_id',
        'notes',
    ];

    protected $casts = [
        'quantity'     => 'float',
        'stock_before' => 'float',
        'stock_after'  => 'float',
        'unit_cost'    => 'decimal:2',
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

    public function lot(): BelongsTo
    {
        return $this->belongsTo(ProductLot::class, 'lot_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeIn($query)
    {
        return $query->where('type', 'in');
    }

    public function scopeOut($query)
    {
        return $query->where('type', 'out');
    }

    public function scopeForSource($query, string $source, int $sourceId)
    {
        return $query->where('source', $source)->where('source_id', $sourceId);
    }

    // ─── Immutabilité ─────────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        // Les mouvements de stock sont un journal d'audit immuable.
        // Pour corriger une erreur : créer un mouvement compensatoire.
        static::updating(function () {
            throw new LogicException(
                'StockMovement est immuable. Créez un mouvement compensatoire pour toute correction.'
            );
        });

        static::deleting(function () {
            throw new LogicException(
                'StockMovement ne peut pas être supprimé. L\'intégrité du journal doit être préservée.'
            );
        });
    }
}
