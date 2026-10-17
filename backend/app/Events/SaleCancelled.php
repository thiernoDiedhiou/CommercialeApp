<?php

namespace App\Events;

use App\Models\Sale;
use Illuminate\Foundation\Events\Dispatchable;

class SaleCancelled
{
    use Dispatchable;

    public function __construct(public readonly Sale $sale) {}
}
