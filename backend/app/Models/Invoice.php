<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use BelongsToTenant, HasUuid, SoftDeletes;

    const STATUS_DRAFT = 'draft';

    const STATUS_SENT = 'sent';

    const STATUS_PAID = 'paid';

    const STATUS_OVERDUE = 'overdue';

    const STATUS_CANCELLED = 'cancelled';

    const TYPE_INVOICE = 'invoice';

    const TYPE_QUOTE = 'quote';

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'user_id',
        'type',
        'reference',
        'status',
        'issue_date',
        'due_date',
        'subtotal',
        'discount_type',
        'discount_value',
        'discount_amount',
        'tax_rate',
        'tax_amount',
        'total',
        'paid_amount',
        'notes',
        'footer',
        'pdf_template',
        'converted_to_id',
        'credit_note_for_id',
        'reminder_count',
        'last_reminder_at',
        'sent_at',
        'paid_at',
        'cancelled_at',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_value' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'sent_at' => 'datetime',
        'paid_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'last_reminder_at' => 'datetime',
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
        return $this->hasMany(InvoiceItem::class)->orderBy('id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(InvoicePayment::class)->orderBy('paid_at');
    }

    public function convertedTo(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'converted_to_id');
    }

    public function creditNoteFor(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'credit_note_for_id');
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_DRAFT);
    }

    public function scopeSent(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_SENT);
    }

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PAID);
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_OVERDUE);
    }

    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_SENT, self::STATUS_OVERDUE]);
    }

    // ─── Helpers financiers ───────────────────────────────────────────────────

    public function amountDue(): string
    {
        return bcsub((string) $this->total, (string) $this->paid_amount, 2);
    }

    public function isPaid(): bool
    {
        return bccomp((string) $this->paid_amount, (string) $this->total, 2) >= 0;
    }

    public function isOverdueDate(): bool
    {
        return $this->due_date !== null
            && $this->due_date->isPast()
            && ! $this->isPaid();
    }

    // ─── Helpers statut ───────────────────────────────────────────────────────

    public function isInvoice(): bool
    {
        return $this->type === self::TYPE_INVOICE;
    }

    public function isQuote(): bool
    {
        return $this->type === self::TYPE_QUOTE;
    }

    public function isCreditNote(): bool
    {
        return $this->credit_note_for_id !== null;
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isSendable(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isPayable(): bool
    {
        return $this->isInvoice()
            && in_array($this->status, [self::STATUS_SENT, self::STATUS_OVERDUE]);
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SENT]);
    }

    public function isConvertible(): bool
    {
        return $this->isQuote()
            && in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SENT])
            && $this->converted_to_id === null;
    }

    public function isCreditNoteEligible(): bool
    {
        return $this->isInvoice() && $this->status === self::STATUS_PAID;
    }
}
