<?php

namespace App\Listeners;

use App\Events\SaleCancelled;
use App\Services\ActivityLogService;

class LogSaleCancelled
{
    public function handle(SaleCancelled $event): void
    {
        ActivityLogService::log(
            'cancel',
            'sales',
            'Vente ' . $event->sale->reference . ' annulée',
            ['uid' => $event->sale->uid],
        );
    }
}
