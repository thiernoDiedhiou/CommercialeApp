<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'name'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
