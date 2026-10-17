<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'uid'             => $this->uid,
            'name'            => $this->name,
            'phone'           => $this->phone,
            'email'           => $this->email,
            'address'         => $this->address,
            'city'            => $this->city,
            'country'         => $this->country,
            'notes'           => $this->notes,
            'is_active'       => $this->is_active,
            'outstanding_debt' => $this->when(
                isset($this->outstanding_debt),
                $this->outstanding_debt
            ),
            'created_at'      => $this->created_at,
            'updated_at'      => $this->updated_at,
        ];
    }
}
