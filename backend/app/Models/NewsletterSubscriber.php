<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class NewsletterSubscriber extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'email', 'is_active', 'unsubscribe_token'];

    protected $casts = ['is_active' => 'boolean'];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function (self $model): void {
            if (empty($model->unsubscribe_token)) {
                $model->unsubscribe_token = bin2hex(random_bytes(32));
            }
        });
    }
}
