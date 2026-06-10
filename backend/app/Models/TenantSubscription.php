<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSubscription extends Model
{
    protected $fillable = [
        'tenant_id',
        'plan_id',
        'billing_cycle',
        'status',
        'starts_at',
        'ends_at',
        'notified_at_days',
        'notes',
    ];

    protected $casts = [
        'starts_at'        => 'datetime',
        'ends_at'          => 'datetime',
        'notified_at_days' => 'array',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** L'abonnement est-il actuellement valide (non expiré) ? */
    public function isValid(): bool
    {
        if (! in_array($this->status, ['trial', 'active'], true)) {
            return false;
        }

        return $this->ends_at === null || $this->ends_at->isFuture();
    }

    /** Nombre de jours avant expiration (null si lifetime). */
    public function daysUntilExpiry(): ?int
    {
        if ($this->ends_at === null) {
            return null;
        }

        return (int) now()->diffInDays($this->ends_at, absolute: false);
    }

    /** Marque un palier de notification comme envoyé. */
    public function markNotified(int $daysThreshold): void
    {
        $notified   = $this->notified_at_days ?? [];
        $notified[] = $daysThreshold;

        $this->update(['notified_at_days' => array_unique($notified)]);
    }

    /** Vérifie si un palier de notification a déjà été envoyé. */
    public function alreadyNotified(int $daysThreshold): bool
    {
        return in_array($daysThreshold, $this->notified_at_days ?? [], true);
    }
}
