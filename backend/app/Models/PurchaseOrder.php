<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrder extends Model
{
    use BelongsToTenant, SoftDeletes;

    const STATUS_DRAFT     = 'draft';
    const STATUS_ORDERED   = 'ordered';
    const STATUS_PARTIAL   = 'partial';
    const STATUS_RECEIVED  = 'received';
    const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'tenant_id',
        'supplier_id',
        'user_id',
        'reference',
        'status',
        'expected_at',
        'received_at',
        'notes',
    ];

    protected $casts = [
        'expected_at' => 'date',
        'received_at' => 'datetime',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_DRAFT);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ORDERED);
    }

    public function scopeReceived(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_RECEIVED);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public function totalAmount(): string
    {
        return $this->items->reduce(
            fn ($carry, $item) => bcadd($carry, bcmul((string) $item->quantity_ordered, (string) $item->unit_cost, 2), 2),
            '0'
        );
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isReceivable(): bool
    {
        return in_array($this->status, [self::STATUS_ORDERED, self::STATUS_PARTIAL]);
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_ORDERED]);
    }
}
