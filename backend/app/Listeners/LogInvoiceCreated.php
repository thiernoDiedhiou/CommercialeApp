<?php

namespace App\Listeners;

use App\Events\InvoiceCreated;
use App\Services\ActivityLogService;

class LogInvoiceCreated
{
    public function handle(InvoiceCreated $event): void
    {
        ActivityLogService::log(
            'create',
            'invoices',
            'Facture ' . $event->invoice->reference . ' créée',
        );
    }
}
