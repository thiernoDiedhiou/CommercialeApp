<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'user_id',
        'reference',
        'offline_id',
        'subtotal',
        'discount_type',
        'discount_value',
        'discount_amount',
        'tax_amount',
        'total',
        'status',
        'note',
        'confirmed_at',
        'cancelled_at',
    ];

    protected $casts = [
        'subtotal'        => 'decimal:2',
        'discount_value'  => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount'      => 'decimal:2',
        'total'           => 'decimal:2',
        'confirmed_at'    => 'datetime',
        'cancelled_at'    => 'datetime',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->latest('paid_at');
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeForPeriod($query, string $from, string $to)
    {
        return $query->whereBetween('confirmed_at', [$from, $to]);
    }

    // ─── Helpers financiers ───────────────────────────────────────────────────

    public function amountPaid(): float
    {
        return (float) $this->payments->sum('amount');
    }

    public function amountRemaining(): float
    {
        return max(0, (float) $this->total - $this->amountPaid());
    }

    public function isPaid(): bool
    {
        return $this->amountRemaining() <= 0;
    }

    public function isPartiallyPaid(): bool
    {
        $paid = $this->amountPaid();
        return $paid > 0 && $paid < (float) $this->total;
    }

    // ─── Helpers statut ───────────────────────────────────────────────────────

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }
}
