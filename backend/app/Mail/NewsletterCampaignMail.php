<?php

namespace App\Mail;

use App\Models\NewsletterCampaign;
use App\Models\NewsletterSubscriber;
use App\Models\ShopSetting;
use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewsletterCampaignMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly NewsletterCampaign $campaign,
        public readonly Tenant $tenant,
        public readonly NewsletterSubscriber $subscriber,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->campaign->subject);
    }

    public function content(): Content
    {
        $shop        = ShopSetting::where('tenant_id', $this->tenant->id)->first();
        $primaryColor = $shop?->primary_color ?? $this->tenant->primary_color ?? '#006948';
        $logoUrl     = $shop?->logo_url;
        $shopName    = $shop?->shop_name ?? $this->tenant->name;
        $shopUrl     = config('app.frontend_url').'/shop/'.$this->tenant->slug;
        $unsubscribeUrl = config('app.url').'/api/v1/public/'.$this->tenant->slug
            .'/newsletter/unsubscribe?token='.$this->subscriber->unsubscribe_token;

        return new Content(
            view: 'emails.newsletter-campaign',
            with: compact('primaryColor', 'logoUrl', 'shopName', 'shopUrl', 'unsubscribeUrl'),
        );
    }
}
