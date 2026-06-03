<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSettings extends Model
{
    protected $fillable = [
        'contact_email',
        'contact_whatsapp',
        'contact_address',
        'contact_hours',
        'facebook_url',
        'twitter_url',
        'linkedin_url',
        'instagram_url',
    ];

    // Singleton : toujours id = 1
    public static function instance(): static
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
