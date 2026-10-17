<?php

namespace App\Jobs;

use App\Mail\InvoiceSentMail;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Services\MailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\SerializesModels;

class SendInvoiceEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 120;
    public array $backoff = [60, 300];

    public function __construct(
        public readonly Invoice $invoice,
        public readonly string $toEmail,
        public readonly ?string $subject = null,
        public readonly ?string $customMessage = null,
    ) {}

    public function middleware(): array
    {
        return [new RateLimited('tenant-notifications')];
    }

    public function handle(MailService $mailService): void
    {
        $mailService->sendInvoice(
            $this->invoice,
            $this->toEmail,
            $this->subject,
            $this->customMessage,
        );
    }
}
