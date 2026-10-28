<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class NewsletterCampaign extends Model
{
    use BelongsToTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'subject',
        'preview_text',
        'body',
        'design',
        'status',
        'recipients_count',
        'sent_at',
    ];

    protected $casts = [
        'sent_at'          => 'datetime',
        'recipients_count' => 'integer',
    ];

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isSent(): bool
    {
        return $this->status === 'sent';
    }
}
