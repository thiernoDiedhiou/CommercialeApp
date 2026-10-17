<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'uid'             => $this->uid,
            'reference'       => $this->reference,
            'status'          => $this->status,
            'subtotal'        => $this->subtotal,
            'discount_type'   => $this->discount_type,
            'discount_value'  => $this->discount_value,
            'discount_amount' => $this->discount_amount,
            'tax_amount'      => $this->tax_amount,
            'total'           => $this->total,
            'paid_amount'     => $this->paid_amount,
            'note'            => $this->note,
            'confirmed_at'    => $this->confirmed_at,
            'cancelled_at'    => $this->cancelled_at,
            'created_at'      => $this->created_at,
            // Relations
            'customer'        => $this->whenLoaded('customer', fn () => $this->customer ? [
                'id'    => $this->customer->id,
                'uid'   => $this->customer->uid,
                'name'  => $this->customer->name,
                'phone' => $this->customer->phone,
            ] : null),
            'user'            => $this->whenLoaded('user', fn () => $this->user ? [
                'id'   => $this->user->id,
                'name' => $this->user->name,
            ] : null),
            'items'           => $this->whenLoaded('items', fn () =>
                $this->items->map(fn ($item) => [
                    'id'           => $item->id,
                    'product_id'   => $item->product_id,
                    'variant_id'   => $item->variant_id,
                    'lot_id'       => $item->lot_id,
                    'product_name' => $item->product_name,
                    'variant_name' => $item->variant_name,
                    'quantity'     => $item->quantity,
                    'unit_price'   => $item->unit_price,
                    'cost_price'   => $item->cost_price,
                    'discount'     => $item->discount,
                    'total'        => $item->total,
                    'product'      => $item->relationLoaded('product') ? [
                        'id'  => $item->product?->id,
                        'uid' => $item->product?->uid,
                    ] : null,
                    'variant'      => $item->relationLoaded('variant') ? [
                        'id'                => $item->variant?->id,
                        'uid'               => $item->variant?->uid,
                        'attribute_summary' => $item->variant?->attribute_summary,
                    ] : null,
                ])
            ),
            'payments'        => $this->whenLoaded('payments', fn () =>
                $this->payments->map(fn ($p) => [
                    'id'        => $p->id,
                    'method'    => $p->method,
                    'amount'    => $p->amount,
                    'reference' => $p->reference,
                    'paid_at'   => $p->paid_at,
                ])
            ),
            // Agrégats index
            'items_count'     => $this->when(isset($this->items_count), $this->items_count),
        ];
    }
}
