<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BranchStock extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'product_id',
        'product_variant_id',
        'quantity',
    ];

    protected $casts = [
        'quantity' => 'float',
        'product_variant_id' => 'integer',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Clé de requête normalisée : "v:{variantId}" ou "p:{productId}".
     * Utilisée pour indexer les collections dans SaleService.
     */
    public function stockKey(): string
    {
        return $this->product_variant_id > 0
            ? "v:{$this->product_variant_id}"
            : "p:{$this->product_id}";
    }
}
