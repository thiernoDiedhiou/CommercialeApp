<?php

namespace App\Http\Resources\Stock;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockTransferResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uid' => $this->uid,
            'reference' => $this->reference,
            'status' => $this->status,
            'notes' => $this->notes,
            'sent_at' => $this->sent_at?->toIso8601String(),
            'received_at' => $this->received_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'from_branch' => $this->whenLoaded('fromBranch', fn () => [
                'uid' => $this->fromBranch->uid,
                'name' => $this->fromBranch->name,
                'type' => $this->fromBranch->type,
            ]),
            'to_branch' => $this->whenLoaded('toBranch', fn () => [
                'uid' => $this->toBranch->uid,
                'name' => $this->toBranch->name,
                'type' => $this->toBranch->type,
            ]),
            'created_by' => $this->whenLoaded('createdBy', fn () => $this->createdBy?->name),
            'received_by' => $this->whenLoaded('receivedBy', fn () => $this->receivedBy?->name),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'quantity' => $item->quantity,
                'notes' => $item->notes,
                'product' => $item->relationLoaded('product') ? [
                    'uid' => $item->product->uid,
                    'name' => $item->product->name,
                    'sku' => $item->product->sku,
                    'unit' => $item->product->unit,
                ] : null,
                'variant' => $item->relationLoaded('variant') && $item->variant ? [
                    'uid' => $item->variant->uid,
                    'attribute_summary' => $item->variant->attribute_summary,
                    'sku' => $item->variant->sku,
                ] : null,
            ])),
            'items_count' => $this->whenLoaded('items', fn () => $this->items->count(), $this->items_count ?? null),
        ];
    }
}
