<?php

namespace App\Listeners;

use App\Events\InvoiceCancelled;
use App\Services\ActivityLogService;

class LogInvoiceCancelled
{
    public function handle(InvoiceCancelled $event): void
    {
        ActivityLogService::log(
            'cancel',
            'invoices',
            'Facture '.$event->invoice->reference.' annulée',
        );
    }
}
