<?php

namespace App\Events;

use App\Models\Invoice;
use Illuminate\Foundation\Events\Dispatchable;

class InvoiceCancelled
{
    use Dispatchable;

    public function __construct(public readonly Invoice $invoice) {}
}
