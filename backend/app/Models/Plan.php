<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'tagline',
        'badge',
        'description',
        'features',
        'sort_order',
        'is_active',
        'is_public',
        'price_monthly',
        'price_yearly',
        'yearly_discount_pct',
        'trial_days',
        'max_users',
        'max_products',
        'max_monthly_sales',
        'feature_pos',
        'feature_invoicing',
        'feature_purchases',
        'feature_reports',
        'feature_shop',
        'feature_import_csv',
        'feature_stock_alerts',
        'feature_multi_user',
        'feature_custom_domain',
    ];

    protected $casts = [
        'features'             => 'array',
        'is_active'            => 'boolean',
        'is_public'            => 'boolean',
        'price_monthly'        => 'decimal:2',
        'price_yearly'         => 'decimal:2',
        'feature_pos'          => 'boolean',
        'feature_invoicing'    => 'boolean',
        'feature_purchases'    => 'boolean',
        'feature_reports'      => 'boolean',
        'feature_shop'         => 'boolean',
        'feature_import_csv'   => 'boolean',
        'feature_stock_alerts' => 'boolean',
        'feature_multi_user'   => 'boolean',
        'feature_custom_domain'=> 'boolean',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function subscriptions(): HasMany
    {
        return $this->hasMany(TenantSubscription::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Retourne true si le plan autorise la fonctionnalité demandée. */
    public function hasFeature(string $feature): bool
    {
        $column = 'feature_' . $feature;

        return property_exists($this, $column) || isset($this->attributes[$column])
            ? (bool) ($this->attributes[$column] ?? false)
            : false;
    }

    /** Prix annuel calculé si non défini (mensuel × 12 avec remise). */
    public function computedYearlyPrice(): ?string
    {
        if ($this->price_yearly !== null) {
            return $this->price_yearly;
        }

        if ($this->yearly_discount_pct) {
            $discount = bcdiv((string) $this->yearly_discount_pct, '100', 4);
            $monthly  = bcmul((string) $this->price_monthly, '12', 2);
            $saving   = bcmul($monthly, $discount, 2);

            return bcsub($monthly, $saving, 2);
        }

        return null;
    }
}
