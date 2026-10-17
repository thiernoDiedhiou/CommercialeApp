<?php

namespace App\Listeners;

use App\Events\InvoiceSent;
use App\Services\ActivityLogService;

class LogInvoiceSent
{
    public function handle(InvoiceSent $event): void
    {
        ActivityLogService::log(
            'send',
            'invoices',
            'Facture ' . $event->invoice->reference . ' envoyée',
        );
    }
}
