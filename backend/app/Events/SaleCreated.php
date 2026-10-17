<?php

namespace App\Events;

use App\Models\Sale;
use Illuminate\Foundation\Events\Dispatchable;

class SaleCreated
{
    use Dispatchable;

    public function __construct(public readonly Sale $sale) {}
}
