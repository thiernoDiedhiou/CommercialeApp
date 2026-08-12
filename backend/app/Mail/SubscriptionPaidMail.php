<?php

namespace App\Mail;

use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\SiteSettings;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionPaidMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly PaymentTransaction $transaction,
        public readonly Tenant             $tenant,
        public readonly Plan               $plan,
        public readonly TenantSubscription $subscription,
        public readonly string             $recipientName,
        public readonly string             $recipientEmail,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            to     : [new Address($this->recipientEmail, $this->recipientName)],
            subject: "Facture {$this->transaction->invoice_number} — Abonnement {$this->plan->name} activé",
        );
    }

    public function content(): Content
    {
        $cycleLabel   = $this->transaction->billing_cycle === 'yearly' ? 'Annuel' : 'Mensuel';
        $siteSettings = SiteSettings::instance();

        // Email de contact : priorité SiteSettings > config mail
        $contactEmail = $siteSettings->contact_email
            ?? config('mail.from.address', 'contact@didisphere.shop');

        return new Content(
            view: 'emails.subscription-paid',
            with: [
                'transaction'   => $this->transaction,
                'tenant'        => $this->tenant,
                'plan'          => $this->plan,
                'subscription'  => $this->subscription,
                'recipientName' => $this->recipientName,
                'cycleLabel'    => $cycleLabel,
                'appName'       => config('app.name', 'DiDi Sphere'),
                'appEmail'      => $contactEmail,
                'dashboardUrl'  => rtrim(config('app.frontend_url', 'https://didisphere.shop'), '/') . '/dashboard',
                'logoUrl'       => rtrim(config('app.frontend_url', 'https://didisphere.shop'), '/') . '/logo_mode_claire.svg',
            ],
        );
    }

    public function attachments(): array
    {
        $transaction  = $this->transaction;
        $tenant       = $this->tenant;
        $plan         = $this->plan;
        $subscription = $this->subscription;
        $cycleLabel   = $transaction->billing_cycle === 'yearly' ? 'Annuel' : 'Mensuel';
        $siteSettings = SiteSettings::instance();

        // Données DiDi Sphere depuis SiteSettings — jamais hardcodées
        $contactEmail     = $siteSettings->contact_email    ?? config('mail.from.address', 'contact@didisphere.shop');
        $contactAddress   = $siteSettings->contact_address  ?? 'Thiès, Sénégal';
        $contactWhatsApp  = $siteSettings->contact_whatsapp ?? null;

        $adminUser = $tenant->users()->whereHas('groups', fn ($q) => $q->where('name', 'Administrateur'))->first();

        return [
            Attachment::fromData(
                fn () => Pdf::loadView('pdf.subscription_invoice', [
                    'transaction'  => $transaction,
                    'tenant'       => $tenant,
                    'plan'         => $plan,
                    'subscription' => $subscription,
                    'cycleLabel'   => $cycleLabel,
                    'isPaid'       => true,
                    'paidAt'       => $transaction->updated_at,
                    'dueAt'        => $transaction->created_at,
                    'tenantEmail'  => $adminUser?->email ?? $tenant->email ?? '',
                    'primaryColor' => '#2465ED',
                    'appName'      => config('app.name', 'DiDi Sphere'),
                    'appEmail'      => $contactEmail,
                    'appWhatsApp'   => $contactWhatsApp,
                    'appWebsite'    => rtrim(config('app.frontend_url', 'https://didisphere.shop'), '/'),
                    'appAddress'    => $contactAddress,
                    'logoUrl'       => null,
                ])->setPaper('a4')->output(),
                "facture-{$transaction->invoice_number}.pdf",
            )->withMime('application/pdf'),
        ];
    }
}
