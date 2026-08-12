<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class PaymentTransaction extends Model
{
    protected $fillable = [
        'idempotency_key',
        'invoice_number',
        'tenant_id',
        'plan_id',
        'provider',
        'provider_token',
        'checkout_url',
        'payment_method_label',
        'billing_cycle',
        'amount',
        'currency',
        'status',
        'expires_at',
        'webhook_payload',
        'subscription_id',
    ];

    protected $casts = [
        'amount'          => 'integer',
        'webhook_payload' => 'array',
        'expires_at'      => 'datetime',
    ];

    // ── Journal append-only ────────────────────────────────────────────────────
    // Une transaction financière ne peut jamais être modifiée après complétion
    // ou échec. Seul le passage de 'pending' vers un état final est autorisé.

    protected static function boot(): void
    {
        parent::boot();

        static::updating(function (PaymentTransaction $transaction) {
            $original = $transaction->getOriginal('status');
            $new      = $transaction->status;

            // Les états finaux sont immuables
            if (in_array($original, ['completed', 'failed'], true) && $original !== $new) {
                throw new LogicException(
                    "PaymentTransaction #{$transaction->id} : impossible de modifier le statut '{$original}' (état final)."
                );
            }
        });

        static::deleting(function () {
            throw new LogicException('PaymentTransaction ne peut pas être supprimée — journal financier immuable.');
        });
    }

    // ── Relations ──────────────────────────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(TenantSubscription::class, 'subscription_id');
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    public function isExpired(): bool
    {
        return $this->isPending()
            && $this->expires_at !== null
            && $this->expires_at->isPast();
    }
}
