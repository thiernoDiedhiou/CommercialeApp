<?php

namespace App\Listeners;

use App\Events\SaleCreated;
use App\Services\ActivityLogService;

class LogSaleCreated
{
    public function handle(SaleCreated $event): void
    {
        ActivityLogService::log(
            'create',
            'sales',
            'Vente ' . $event->sale->reference . ' créée',
            ['uid' => $event->sale->uid, 'total' => $event->sale->total],
        );
    }
}
