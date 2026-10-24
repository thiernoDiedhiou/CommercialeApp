<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BranchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uid'           => $this->uid,
            'name'          => $this->name,
            'type'          => $this->type,
            'address'       => $this->address,
            'phone'         => $this->phone,
            'is_active'     => $this->is_active,
            'display_order' => $this->display_order,
            'has_pos'       => $this->hasPos(),
            'created_at'    => $this->created_at,
        ];
    }
}
