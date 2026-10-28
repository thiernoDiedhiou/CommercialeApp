<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class NewsletterSubscriber extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'email', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];
}
