<?php

namespace App\Notifications;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Tenant;
use Illuminate\Notifications\Notification;

class StockAlertInAppNotification extends Notification
{
    public function __construct(
        public readonly Tenant          $tenant,
        public readonly Product         $product,
        public readonly ?ProductVariant $variant = null,
    ) {}

    public function via(mixed $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(mixed $notifiable): array
    {
        $stockQty = $this->variant?->stock_quantity ?? $this->product->stock_quantity;
        $name     = $this->variant
            ? "{$this->product->name} — {$this->variant->display_name}"
            : $this->product->name;

        return [
            'type'            => 'stock_alert',
            'product_id'      => $this->product->id,
            'product_name'    => $name,
            'variant_id'      => $this->variant?->id,
            'stock_quantity'  => $stockQty,
            'alert_threshold' => $this->product->alert_threshold,
            'tenant_id'       => $this->tenant->id,
        ];
    }
}
