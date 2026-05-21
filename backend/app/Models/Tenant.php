<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'api_key',
        'sector',
        'currency',
        'locale',
        'timezone',
        'phone',
        'email',
        'address',
        'city',
        'country',
        'rccm',
        'ninea',
        'logo_path',
        'primary_color',
        'secondary_color',
        'is_active',
        'trial_ends_at',
        'subscription_ends_at',
    ];

    protected $casts = [
        'is_active'             => 'boolean',
        'trial_ends_at'         => 'datetime',
        'subscription_ends_at'  => 'datetime',
    ];

    protected $hidden = [
        'api_key', // ne jamais exposer la clé dans les réponses JSON
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function settings(): HasMany
    {
        return $this->hasMany(TenantSetting::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isFashion(): bool
    {
        return $this->sector === 'fashion';
    }

    public function isFood(): bool
    {
        return $this->sector === 'food';
    }

    public function isCosmetic(): bool
    {
        return $this->sector === 'cosmetic';
    }

    public function supportsVariants(): bool
    {
        return in_array($this->sector, ['fashion', 'cosmetic'], true);
    }

    public function supportsWeightSale(): bool
    {
        return $this->sector === 'food';
    }

    public function supportsExpiryTracking(): bool
    {
        return in_array($this->sector, ['cosmetic', 'food'], true);
    }

    // ─── Boot ─────────────────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Tenant $tenant) {
            if (empty($tenant->slug)) {
                $tenant->slug = Str::slug($tenant->name);
            }

            if (empty($tenant->api_key)) {
                $tenant->api_key = Str::random(64);
            }
        });
    }
}
