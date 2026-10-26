<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class InvoicePayment extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'invoice_id',
        'tenant_id',
        'amount',
        'method',
        'paid_at',
        'reference',
        'note',
        'user_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'date',
    ];

    const METHODS = [
        'cash' => 'Espèces',
        'bank_transfer' => 'Virement bancaire',
        'mobile_money' => 'Mobile Money',
        'check' => 'Chèque',
        'other' => 'Autre',
    ];

    protected static function boot(): void
    {
        parent::boot();

        // Journal append-only : aucune modification ni suppression
        static::updating(fn () => throw new LogicException('Les paiements sont immuables.'));
        static::deleting(fn () => throw new LogicException('Les paiements ne peuvent pas être supprimés.'));
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
