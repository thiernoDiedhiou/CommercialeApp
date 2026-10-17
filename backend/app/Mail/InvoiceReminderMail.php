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

class InvoiceReminderMail extends Mailable
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
        $count = $this->invoice->reminder_count;
        $label = $count > 1 ? "(relance n°{$count})" : '(relance)';

        return new Envelope(
            subject: "Rappel : Facture {$this->invoice->reference} en attente de règlement {$label}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.invoice-reminder',
        );
    }

    public function attachments(): array
    {
        $invoice = $this->invoice;
        $tenant  = $this->tenant;

        $footer   = $invoice->footer
            ?? $tenant->settings()->where('key', 'invoice_footer')->value('value')
            ?? 'Merci de votre confiance';
        $template = $invoice->pdf_template
            ?? $tenant->settings()->where('key', 'pdf_template')->value('value')
            ?? 'classic';

        return [
            Attachment::fromData(
                fn () => Pdf::loadView('pdf.invoice_doc', [
                    'invoice'  => $invoice,
                    'tenant'   => $tenant,
                    'footer'   => $footer,
                    'template' => $template,
                ])->output(),
                "facture-{$invoice->reference}.pdf",
            )->withMime('application/pdf'),
        ];
    }
}
