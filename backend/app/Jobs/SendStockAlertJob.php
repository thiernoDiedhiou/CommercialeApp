<?php

namespace App\Jobs;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Tenant;
use App\Services\MailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendStockAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public array $backoff = [60, 300]; // 1 min puis 5 min entre les tentatives

    public function __construct(
        public readonly Tenant $tenant,
        public readonly Product $product,
        public readonly ?ProductVariant $variant = null,
    ) {}

    public function handle(MailService $mailService): void
    {
        $mailService->sendStockAlert($this->tenant, $this->product, $this->variant);
    }

    public function queue(): string
    {
        return 'notifications';
    }
}
