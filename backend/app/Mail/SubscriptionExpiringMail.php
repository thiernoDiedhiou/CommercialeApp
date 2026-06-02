<?php

namespace App\Mail;

use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionExpiringMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Tenant             $tenant,
        public readonly User               $recipient,
        public readonly TenantSubscription $subscription,
        public readonly int                $daysLeft,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->daysLeft === 1
            ? "⚠ Votre abonnement {$this->tenant->name} expire demain"
            : "⚠ Votre abonnement {$this->tenant->name} expire dans {$this->daysLeft} jours";

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.subscription-expiring');
    }
}
