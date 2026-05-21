<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShopOrder extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'reference',
        'customer_name',
        'customer_phone',
        'customer_email',
        'customer_address',
        'delivery_zone',
        'delivery_fee',
        'subtotal',
        'total',
        'status',
        'payment_method',
        'payment_status',
        'paydunya_token',
        'notes',
        'confirmed_at',
        'delivered_at',
    ];

    protected $casts = [
        'delivery_fee'  => 'decimal:2',
        'subtotal'      => 'decimal:2',
        'total'         => 'decimal:2',
        'confirmed_at'  => 'datetime',
        'delivered_at'  => 'datetime',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function items(): HasMany
    {
        return $this->hasMany(ShopOrderItem::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function totalFormatted(): string
    {
        return number_format((float) $this->total, 0, ',', ' ') . ' FCFA';
    }

    public function statusLabel(): string
    {
        return match ($this->status) {
            'pending'   => 'En attente',
            'confirmed' => 'Confirmée',
            'preparing' => 'En préparation',
            'shipped'   => 'Expédiée',
            'delivered' => 'Livrée',
            'cancelled' => 'Annulée',
            default     => $this->status,
        };
    }

    public function whatsappMessage(): string
    {
        $lines = $this->items->map(function (ShopOrderItem $item) {
            $qty  = fmod((float) $item->quantity, 1.0) === 0.0
                ? (int) $item->quantity
                : $item->quantity;
            $name = $item->variant_name
                ? "{$item->product_name} ({$item->variant_name})"
                : $item->product_name;

            return "• {$name} × {$qty} — " . number_format((float) $item->total, 0, ',', ' ') . ' FCFA';
        })->join("\n");

        return implode("\n", [
            "🛍️ Commande {$this->reference}",
            '',
            $lines,
            '',
            'Livraison : ' . (($this->delivery_fee > 0)
                ? number_format((float) $this->delivery_fee, 0, ',', ' ') . ' FCFA'
                : 'À définir'),
            '*Total : ' . $this->totalFormatted() . '*',
            '',
            "👤 {$this->customer_name}",
            "📞 {$this->customer_phone}",
            "📍 {$this->customer_address}",
            $this->notes ? "\n💬 {$this->notes}" : '',
        ]);
    }
}
