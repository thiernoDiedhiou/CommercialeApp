<?php

namespace App\Mail;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StockAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Tenant $tenant,
        public readonly Product $product,
        public readonly ?ProductVariant $variant,
        public readonly float $currentStock,
        public readonly int $threshold,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[{$this->tenant->name}] ⚠️ Stock bas : {$this->product->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.stock-alert',
        );
    }
}
