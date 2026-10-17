<?php

namespace App\Listeners;

use App\Events\InvoicePaid;
use App\Services\ActivityLogService;

class LogInvoicePaid
{
    public function handle(InvoicePaid $event): void
    {
        ActivityLogService::log(
            'payment',
            'invoices',
            'Paiement enregistré sur ' . $event->invoice->reference,
        );
    }
}
