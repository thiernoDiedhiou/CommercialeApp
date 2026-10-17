<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'user_id', 'user_name', 'user_role',
        'action', 'module', 'description', 'properties', 'ip_address',
    ];

    protected $casts = ['properties' => 'array'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function boot(): void
    {
        parent::boot();
        static::updating(fn () => throw new \LogicException('ActivityLog is immutable.'));
        static::deleting(fn () => throw new \LogicException('ActivityLog is immutable.'));
    }
}
