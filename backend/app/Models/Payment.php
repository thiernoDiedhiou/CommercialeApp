<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'sale_id',
        'method',
        'amount',
        'reference',
        'paid_at',
    ];

    protected $casts = [
        'amount'  => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    // Libellés lisibles pour l'UI et les factures PDF
    public const METHOD_LABELS = [
        'cash'         => 'Espèces',
        'card'         => 'Carte bancaire',
        'transfer'     => 'Virement',
        'mobile_money' => 'Mobile Money',
        'credit'       => 'Crédit',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function methodLabel(): string
    {
        return self::METHOD_LABELS[$this->method] ?? $this->method;
    }
}
