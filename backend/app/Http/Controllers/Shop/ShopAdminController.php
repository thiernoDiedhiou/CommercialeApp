<?php

namespace App\Http\Controllers\Shop;

use App\Exceptions\StockInsufficientException;
use App\Http\Controllers\Controller;
use App\Models\ProductLot;
use App\Models\ShopOrder;
use App\Models\ShopOrderItem;
use App\Models\ShopSetting;
use App\Services\StockService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ShopAdminController extends Controller
{
    // Transitions autorisées par statut actuel
    private const TRANSITIONS = [
        'pending'   => ['confirmed', 'cancelled'],
        'confirmed' => ['preparing', 'cancelled'],
        'preparing' => ['shipped', 'cancelled'],
        'shipped'   => ['delivered'],
        'delivered' => [],
        'cancelled' => [],
    ];

    public function __construct(
        private readonly TenantService $tenantService,
        private readonly StockService $stockService,
    ) {}

    // ── GET /api/v1/shop/settings ─────────────────────────────────────────────

    public function settings(): JsonResponse
    {
        $tenantId = $this->tenantService->currentId();

        $shop = ShopSetting::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->first();

        if (! $shop) {
            return response()->json([
                'data' => [
                    'is_active'       => false,
                    'payment_methods' => ['cod', 'whatsapp'],
                ],
            ]);
        }

        return response()->json(['data' => $shop]);
    }

    // ── PUT /api/v1/shop/settings ─────────────────────────────────────────────

    public function updateSettings(Request $request): JsonResponse
    {
        $tenantId = $this->tenantService->currentId();

        $validated = $request->validate([
            'shop_name'               => ['nullable', 'string', 'max:150'],
            'shop_description'        => ['nullable', 'string', 'max:1000'],
            'hero_title'              => ['nullable', 'string', 'max:200'],
            'hero_subtitle'           => ['nullable', 'string', 'max:255'],
            'primary_color'           => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondary_color'         => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color'            => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'whatsapp_number'         => ['nullable', 'string', 'max:20'],
            'facebook_url'            => ['nullable', 'url', 'max:255'],
            'instagram_url'           => ['nullable', 'url', 'max:255'],
            'twitter_url'             => ['nullable', 'url', 'max:255'],
            'address'                 => ['nullable', 'string', 'max:255'],
            'opening_hours'           => ['nullable', 'string', 'max:255'],
            'minimum_order'           => ['nullable', 'numeric', 'min:0'],
            'delivery_zones'          => ['nullable', 'array'],
            'delivery_zones.*.name'   => ['required_with:delivery_zones', 'string', 'max:100'],
            'delivery_zones.*.fee'    => ['required_with:delivery_zones', 'numeric', 'min:0'],
            'payment_methods'         => ['nullable', 'array'],
            'payment_methods.*'       => [Rule::in(['cod', 'whatsapp'])],
            'announcement_bar'        => ['nullable', 'string', 'max:255'],
            'announcement_bar_active' => ['nullable', 'boolean'],
            'footer_text'             => ['nullable', 'string', 'max:500'],
            'meta_title'              => ['nullable', 'string', 'max:160'],
            'meta_description'        => ['nullable', 'string', 'max:320'],
            'google_analytics_id'     => ['nullable', 'string', 'max:30'],
            'logo'                    => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
            'favicon'                 => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:512'],
            'hero_banner'             => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ]);

        $shop = ShopSetting::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->first();

        $updateData = collect($validated)
            ->except(['logo', 'favicon', 'hero_banner'])
            ->toArray();

        // ── Uploads ───────────────────────────────────────────────────────────
        if ($request->hasFile('logo')) {
            $this->deleteStoredFile($shop?->logo_url);
            $path = $request->file('logo')->store("shops/{$tenantId}", 'public');
            $updateData['logo_url'] = Storage::disk('public')->url($path);
        }

        if ($request->hasFile('favicon')) {
            $this->deleteStoredFile($shop?->favicon_url);
            $path = $request->file('favicon')->store("shops/{$tenantId}", 'public');
            $updateData['favicon_url'] = Storage::disk('public')->url($path);
        }

        if ($request->hasFile('hero_banner')) {
            if ($shop?->hero_banner_path) {
                Storage::disk('public')->delete($shop->hero_banner_path);
            }
            $updateData['hero_banner_path'] = $request->file('hero_banner')
                ->store("shops/{$tenantId}", 'public');
        }

        $shop = ShopSetting::withoutGlobalScopes()->updateOrCreate(
            ['tenant_id' => $tenantId],
            array_merge(['tenant_id' => $tenantId], $updateData),
        );

        return response()->json(['data' => $shop]);
    }

    // ── POST /api/v1/shop/settings/toggle-active ──────────────────────────────

    public function toggleActive(): JsonResponse
    {
        $tenantId = $this->tenantService->currentId();

        $shop       = ShopSetting::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->first();
        $activating = ! ($shop?->is_active ?? false);

        if ($activating && (! $shop || empty($shop->shop_name))) {
            return response()->json([
                'message' => "Veuillez renseigner le nom de la boutique avant de l'activer.",
            ], 422);
        }

        $shop = ShopSetting::withoutGlobalScopes()->updateOrCreate(
            ['tenant_id' => $tenantId],
            ['tenant_id' => $tenantId, 'is_active' => $activating],
        );

        return response()->json([
            'is_active' => $shop->is_active,
            'message'   => $shop->is_active ? 'Boutique activée.' : 'Boutique désactivée.',
        ]);
    }

    // ── GET /api/v1/shop/orders ───────────────────────────────────────────────

    public function orders(Request $request): JsonResponse
    {
        $orders = ShopOrder::withCount('items')
            ->when($request->filled('status'), fn($q) =>
                $q->where('status', $request->status)
            )
            ->when($request->filled('from'), fn($q) =>
                $q->whereDate('created_at', '>=', $request->from)
            )
            ->when($request->filled('to'), fn($q) =>
                $q->whereDate('created_at', '<=', $request->to)
            )
            ->when($request->filled('search'), function ($q) use ($request) {
                $s = '%' . $request->search . '%';
                $q->where(fn($sub) =>
                    $sub->where('reference', 'like', $s)
                        ->orWhere('customer_name', 'like', $s)
                        ->orWhere('customer_phone', 'like', $s)
                );
            })
            ->orderByDesc('created_at')
            ->paginate(20);

        $orders->through(fn($o) => $this->formatOrder($o));

        return response()->json($orders);
    }

    // ── GET /api/v1/shop/orders/{order} ──────────────────────────────────────

    public function showOrder(ShopOrder $order): JsonResponse
    {
        $order->load([
            'items.product:id,name',
            'items.variant:id,attribute_summary',
        ]);

        $tenantId    = $this->tenantService->currentId();
        $whatsappNum = ShopSetting::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->value('whatsapp_number');

        $whatsappUrl = null;
        if ($whatsappNum && $order->payment_method === 'whatsapp') {
            $number      = preg_replace('/[^0-9]/', '', $whatsappNum);
            $whatsappUrl = 'https://wa.me/' . $number . '?text=' . urlencode($order->whatsappMessage());
        }

        return response()->json([
            'data'         => $this->formatOrder($order, detailed: true),
            'whatsapp_url' => $whatsappUrl,
        ]);
    }

    // ── PUT /api/v1/shop/orders/{order}/status ────────────────────────────────

    public function updateStatus(Request $request, ShopOrder $order): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in([
                'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled',
            ])],
        ]);

        $newStatus = $validated['status'];
        $allowed   = self::TRANSITIONS[$order->status] ?? [];

        if (! in_array($newStatus, $allowed, true)) {
            return response()->json([
                'message' => "Transition impossible : {$order->status} → {$newStatus}.",
            ], 422);
        }

        // ── Confirmation → décrémente le stock par item ───────────────────────
        if ($newStatus === 'confirmed') {
            $order->load(['items.product', 'items.variant']);

            try {
                DB::transaction(function () use ($order) {
                    foreach ($order->items as $item) {
                        if (! $item->product) {
                            continue; // Produit supprimé — snapshot conservé, stock ignoré
                        }

                        $lot = $item->lot_id
                            ? ProductLot::withoutGlobalScopes()->find($item->lot_id)
                            : null;

                        $this->stockService->adjust(
                            product:  $item->product,
                            type:     'out',
                            quantity: (float) $item->quantity,
                            source:   'shop_order',
                            sourceId: $item->id,   // idempotence par item
                            variant:  $item->variant ?? null,
                            lot:      $lot,
                        );
                    }

                    $order->update([
                        'status'       => 'confirmed',
                        'confirmed_at' => now(),
                    ]);
                });
            } catch (StockInsufficientException $e) {
                return response()->json($e->toArray(), 422);
            }

            return response()->json(['data' => $order->fresh()]);
        }

        // ── Autres transitions ────────────────────────────────────────────────
        $extra = match ($newStatus) {
            'delivered' => ['delivered_at' => now()],
            default     => [],
        };

        $order->update(array_merge(['status' => $newStatus], $extra));

        return response()->json(['data' => $order->fresh()]);
    }

    // ── Helpers privés ────────────────────────────────────────────────────────

    private function formatOrder(ShopOrder $order, bool $detailed = false): array
    {
        $data = [
            'id'               => $order->id,
            'reference'        => $order->reference,
            'customer_name'    => $order->customer_name,
            'customer_phone'   => $order->customer_phone,
            'customer_email'   => $order->customer_email,
            'customer_address' => $order->customer_address,
            'delivery_zone'    => $order->delivery_zone,
            'delivery_fee'     => (float) $order->delivery_fee,
            'subtotal'         => (float) $order->subtotal,
            'total'            => (float) $order->total,
            'formatted_total'  => $order->totalFormatted(),
            'status'           => $order->status,
            'status_label'     => $order->statusLabel(),
            'payment_method'   => $order->payment_method,
            'payment_status'   => $order->payment_status,
            'notes'            => $order->notes,
            'items_count'      => $order->items_count ?? null,
            'confirmed_at'     => $order->confirmed_at?->toISOString(),
            'delivered_at'     => $order->delivered_at?->toISOString(),
            'created_at'       => $order->created_at?->toISOString(),
        ];

        if ($detailed && $order->relationLoaded('items')) {
            $data['items'] = $order->items->map(fn($item) => [
                'id'           => $item->id,
                'product_id'   => $item->product_id,
                'product_name' => $item->product_name,
                'variant_id'   => $item->variant_id,
                'variant_name' => $item->variant_name,
                'image_path'   => $item->image_path,
                'quantity'     => (float) $item->quantity,
                'unit_price'   => (float) $item->unit_price,
                'total'        => (float) $item->total,
                'product'      => $item->product
                    ? ['id' => $item->product->id, 'name' => $item->product->name]
                    : null,
                'variant'      => $item->variant
                    ? ['id' => $item->variant->id, 'attribute_summary' => $item->variant->attribute_summary]
                    : null,
            ])->values();
        }

        return $data;
    }

    private function deleteStoredFile(?string $url): void
    {
        if (! $url) {
            return;
        }
        $disk    = Storage::disk('public');
        $baseUrl = $disk->url('');

        if (str_starts_with($url, $baseUrl)) {
            $path = ltrim(str_replace($baseUrl, '', $url), '/');
            if ($disk->exists($path)) {
                $disk->delete($path);
            }
        }
    }
}
