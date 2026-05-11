<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleReturn extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'sale_id',
        'user_id',
        'reference',
        'reason',
        'refund_method',
        'total',
    ];

    protected $casts = [
        'total' => 'decimal:2',
    ];

    public const REFUND_LABELS = [
        'cash'   => 'Remboursement espèces',
        'credit' => 'Avoir client',
        'none'   => 'Aucun remboursement',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleReturnItem::class);
    }
}
