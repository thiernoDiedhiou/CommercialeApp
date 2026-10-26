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
        public readonly ?string $customSubject = null,
        public readonly ?string $customMessage = null,
    ) {
        $this->invoice->loadMissing(['customer', 'items.product', 'creditNoteFor:id,reference']);
    }

    public function envelope(): Envelope
    {
        $label = $this->invoice->isQuote() ? 'Devis' : ($this->invoice->isCreditNote() ? 'Avoir' : 'Facture');
        $subject = $this->customSubject
            ?? "{$label} {$this->invoice->reference} — {$this->tenant->name}";

        return new Envelope(subject: $subject);
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
        $tenant = $this->tenant;

        $footer = $invoice->footer
            ?? $tenant->settings()->where('key', 'invoice_footer')->value('value')
            ?? 'Merci de votre confiance';

        return [
            Attachment::fromData(
                fn () => Pdf::loadView('pdf.invoice_doc', [
                    'invoice' => $invoice,
                    'tenant' => $tenant,
                    'footer' => $footer,
                ])->output(),
                ($invoice->isCreditNote() ? 'avoir' : ($invoice->isQuote() ? 'devis' : 'facture'))."-{$invoice->reference}.pdf",
            )->withMime('application/pdf'),
        ];
    }
}
