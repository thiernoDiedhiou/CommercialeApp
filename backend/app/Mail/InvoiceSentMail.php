<?php

namespace App\Mail;

use App\Models\Invoice;
use App\Models\Tenant;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InvoiceSentMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Invoice $invoice,
        public readonly Tenant $tenant,
    ) {
        $this->invoice->loadMissing(['customer', 'items.product']);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Facture {$this->invoice->reference} — {$this->tenant->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.invoice-sent',
        );
    }

    public function attachments(): array
    {
        $invoice = $this->invoice;
        $tenant  = $this->tenant;

        $footer = $invoice->footer
            ?? $tenant->settings()->where('key', 'invoice_footer')->value('value')
            ?? 'Merci de votre confiance';

        return [
            Attachment::fromData(
                fn () => Pdf::loadView('pdf.invoice_doc', [
                    'invoice' => $invoice,
                    'tenant'  => $tenant,
                    'footer'  => $footer,
                ])->output(),
                "facture-{$invoice->reference}.pdf",
            )->withMime('application/pdf'),
        ];
    }
}
