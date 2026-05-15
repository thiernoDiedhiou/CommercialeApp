<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ShopSetting extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'is_active',
        'shop_name',
        'shop_description',
        'hero_title',
        'hero_subtitle',
        'hero_banner_path',
        'logo_url',
        'favicon_url',
        'primary_color',
        'secondary_color',
        'accent_color',
        'whatsapp_number',
        'facebook_url',
        'instagram_url',
        'twitter_url',
        'address',
        'opening_hours',
        'minimum_order',
        'delivery_zones',
        'payment_methods',
        'announcement_bar',
        'announcement_bar_active',
        'footer_text',
        'meta_title',
        'meta_description',
        'google_analytics_id',
    ];

    protected $casts = [
        'is_active'               => 'boolean',
        'announcement_bar_active' => 'boolean',
        'minimum_order'           => 'decimal:2',
        'delivery_zones'          => 'array',
        'payment_methods'         => 'array',
    ];

    protected $appends = ['hero_banner_url'];

    protected $attributes = [
        'payment_methods' => '["cod","whatsapp"]',
    ];

    public function getHeroBannerUrlAttribute(): ?string
    {
        return $this->hero_banner_path
            ? Storage::disk('public')->url($this->hero_banner_path)
            : null;
    }
}
