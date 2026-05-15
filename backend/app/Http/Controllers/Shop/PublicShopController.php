<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductLot;
use App\Models\ShopOrder;
use App\Models\ShopOrderItem;
use App\Models\ShopSetting;
use App\Models\Tenant;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PublicShopController extends Controller
{
    public function __construct(private readonly TenantService $tenantService) {}

    // ── GET /api/v1/public/{slug}/config ──────────────────────────────────────

    public function config(Request $request): JsonResponse
    {
        /** @var ShopSetting $shop */
        $shop   = $request->attributes->get('shop');
        $tenant = $this->tenantService->current();

        // Couleurs : shop color → couleur tenant comme fallback
        $primary   = $shop->primary_color   ?? $tenant->primary_color;
        $secondary = $shop->secondary_color ?? $tenant->secondary_color;
        $accent    = $shop->accent_color    ?? $primary;

        return response()->json([
            'shop' => [
                'name'                     => $shop->shop_name   ?? $tenant->name,
                'description'              => $shop->shop_description,
                'hero_title'               => $shop->hero_title,
                'hero_subtitle'            => $shop->hero_subtitle,
                'hero_banner_url'          => $shop->hero_banner_url,
                'logo_url'                 => $shop->logo_url,
                'favicon_url'              => $shop->favicon_url,
                'announcement_bar'         => $shop->announcement_bar,
                'announcement_bar_active'  => $shop->announcement_bar_active,
                'whatsapp_number'          => $shop->whatsapp_number,
                'facebook_url'             => $shop->facebook_url,
                'instagram_url'            => $shop->instagram_url,
                'twitter_url'              => $shop->twitter_url,
                'address'                  => $shop->address,
                'opening_hours'            => $shop->opening_hours,
                'footer_text'              => $shop->footer_text,
                'minimum_order'            => (float) $shop->minimum_order,
                'payment_methods'          => $shop->payment_methods ?? ['cod', 'whatsapp'],
                'delivery_zones'           => $shop->delivery_zones ?? [],
            ],
            'theme' => [
                'primary_color'   => $primary,
                'secondary_color' => $secondary,
                'accent_color'    => $accent,
            ],
            'seo' => [
                'meta_title'       => $shop->meta_title       ?? $shop->shop_name ?? $tenant->name,
                'meta_description' => $shop->meta_description,
            ],
        ]);
    }

    // ── GET /api/v1/public/{slug}/products ────────────────────────────────────

    public function products(Request $request): JsonResponse
    {
        $perPage = min((int) $request->input('per_page', 12), 48);

        $products = Product::with(['category', 'activeVariants'])
            ->where('is_active', true)
            ->where('is_for_sale', true)
            ->when($request->filled('category_id'), fn($q) =>
                $q->where('category_id', $request->integer('category_id'))
            )
            ->when($request->filled('search'), fn($q) =>
                $q->where('name', 'like', '%' . $request->search . '%')
            )
            ->orderBy('name')
            ->paginate($perPage);

        $collection = $products->getCollection()->map(fn($p) => $this->formatProduct($p));
        $products->setCollection($collection);

        return response()->json($products);
    }

    // ── GET /api/v1/public/{slug}/products/{productId} ────────────────────────

    public function product(int $productId): JsonResponse
    {
        $product = Product::with(['category', 'activeVariants'])
            ->where('is_active', true)
            ->where('is_for_sale', true)
            ->findOrFail($productId);

        return response()->json(['data' => $this->formatProduct($product, detailed: true)]);
    }

    // ── GET /api/v1/public/{slug}/categories ──────────────────────────────────

    public function categories(): JsonResponse
    {
        $categories = Category::withCount(['products' => fn($q) =>
            $q->where('is_active', true)->where('is_for_sale', true)
        ])
        ->having('products_count', '>', 0)
        ->orderBy('name')
        ->get()
        ->map(fn($c) => [
            'id'             => $c->id,
            'name'           => $c->name,
            'slug'           => $c->slug,
            'products_count' => $c->products_count,
        ]);

        return response()->json(['data' => $categories]);
    }

    // ── POST /api/v1/public/{slug}/orders ─────────────────────────────────────

    public function order(Request $request): JsonResponse
    {
        /** @var ShopSetting $shop */
        $shop     = $request->attributes->get('shop');
        $tenantId = $this->tenantService->currentId();

        $validated = $request->validate([
            'customer_name'      => ['required', 'string', 'max:150'],
            'customer_phone'     => ['required', 'string', 'max:30'],
            'customer_email'     => ['nullable', 'email', 'max:150'],
            'customer_address'   => ['required', 'string', 'max:255'],
            'delivery_zone'      => ['nullable', 'string', 'max:100'],
            'payment_method'     => ['required', Rule::in(['cod', 'whatsapp'])],
            'notes'              => ['nullable', 'string', 'max:500'],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.variant_id' => ['nullable', 'integer'],
            'items.*.quantity'   => ['required', 'numeric', 'min:0.001'],
        ]);

        // ── Résolution des produits + calcul des totaux ────────────────────────
        $productIds = array_column($validated['items'], 'product_id');
        $products   = Product::with('activeVariants')
            ->where('is_active', true)
            ->where('is_for_sale', true)
            ->whereIn('id', $productIds)
            ->get()
            ->keyBy('id');

        $itemsData = [];
        $subtotal  = 0.0;

        foreach ($validated['items'] as $item) {
            $product = $products->get($item['product_id']);

            if (! $product) {
                return response()->json([
                    'message' => "Produit #{$item['product_id']} introuvable ou non disponible.",
                ], 422);
            }

            $variantId   = $item['variant_id'] ?? null;
            $variantName = null;
            $unitPrice   = (float) $product->price;
            $lotId       = null;

            // TYPE 1 — Variante
            if ($variantId) {
                $variant = $product->activeVariants->firstWhere('id', $variantId);
                if (! $variant) {
                    return response()->json([
                        'message' => "Variante #{$variantId} introuvable pour {$product->name}.",
                    ], 422);
                }
                $unitPrice   = (float) $variant->price;
                $variantName = $variant->attribute_summary;
            }

            // TYPE 3 — Lot FIFO (has_expiry)
            if ($product->has_expiry) {
                $lot = ProductLot::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('product_id', $product->id)
                    ->where('is_active', true)
                    ->where('quantity_remaining', '>', 0)
                    ->where(function ($q) {
                        $q->whereNull('expiry_date')
                          ->orWhere('expiry_date', '>', now()->toDateString());
                    })
                    ->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END')
                    ->orderBy('expiry_date')
                    ->first();

                $lotId = $lot?->id;
            }

            $qty   = (float) $item['quantity'];
            $total = round($qty * $unitPrice, 2);

            $itemsData[] = [
                'product_id'   => $product->id,
                'variant_id'   => $variantId,
                'lot_id'       => $lotId,
                'product_name' => $product->name,
                'variant_name' => $variantName,
                'image_path'   => $product->image_path,
                'quantity'     => $qty,
                'unit_price'   => $unitPrice,
                'total'        => $total,
            ];

            $subtotal += $total;
        }

        // ── Vérification minimum_order ─────────────────────────────────────────
        $minimumOrder = (float) $shop->minimum_order;
        if ($minimumOrder > 0 && $subtotal < $minimumOrder) {
            return response()->json([
                'message' => "Le montant minimum de commande est de " .
                    number_format($minimumOrder, 0, ',', ' ') . ' FCFA.',
            ], 422);
        }

        // ── Frais de livraison ────────────────────────────────────────────────
        $deliveryFee = $this->resolveDeliveryFee($shop, $validated['delivery_zone'] ?? null);
        $total       = round($subtotal + $deliveryFee, 2);

        // ── Transaction + verrou référence ────────────────────────────────────
        $order = DB::transaction(function () use (
            $validated, $itemsData, $subtotal, $deliveryFee, $total, $tenantId
        ) {
            Tenant::lockForUpdate()->find($tenantId);

            $year      = now()->year;
            $count     = ShopOrder::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->whereYear('created_at', $year)
                ->count();
            $reference = 'CMD-' . $year . '-' . str_pad($count + 1, 5, '0', STR_PAD_LEFT);

            $order = ShopOrder::create([
                'tenant_id'        => $tenantId,
                'reference'        => $reference,
                'customer_name'    => $validated['customer_name'],
                'customer_phone'   => $validated['customer_phone'],
                'customer_email'   => $validated['customer_email'] ?? null,
                'customer_address' => $validated['customer_address'],
                'delivery_zone'    => $validated['delivery_zone'] ?? null,
                'delivery_fee'     => $deliveryFee,
                'subtotal'         => $subtotal,
                'total'            => $total,
                'payment_method'   => $validated['payment_method'],
                'notes'            => $validated['notes'] ?? null,
            ]);

            foreach ($itemsData as $item) {
                ShopOrderItem::create(array_merge($item, ['shop_order_id' => $order->id]));
            }

            return $order;
        });

        // ── Réponse + URL WhatsApp ─────────────────────────────────────────────
        $whatsappUrl = null;
        if ($shop->whatsapp_number && $validated['payment_method'] === 'whatsapp') {
            $order->load('items');
            $number      = preg_replace('/[^0-9]/', '', $shop->whatsapp_number);
            $whatsappUrl = 'https://wa.me/' . $number . '?text=' . urlencode($order->whatsappMessage());
        }

        return response()->json([
            'order' => [
                'reference' => $order->reference,
                'total'     => (float) $order->total,
                'status'    => $order->status,
            ],
            'whatsapp_url' => $whatsappUrl,
        ], 201);
    }

    // ── Helpers privés ────────────────────────────────────────────────────────

    private function formatProduct(Product $product, bool $detailed = false): array
    {
        $variants  = $product->activeVariants;
        $minPrice  = null;

        if ($product->has_variants && $variants->isNotEmpty()) {
            $withStock = $variants->where('stock_quantity', '>', 0);
            $pool      = $withStock->isNotEmpty() ? $withStock : $variants;
            $minPrice  = (float) $pool->min('price');
        }

        $data = [
            'id'              => $product->id,
            'name'            => $product->name,
            'slug'            => $product->slug,
            'price'           => (float) $product->price,
            'unit'            => $product->unit,
            'has_variants'    => $product->has_variants,
            'is_weight_based' => $product->is_weight_based,
            'has_expiry'      => $product->has_expiry,
            'image_url'       => $product->image_url,
            'stock_quantity'  => $product->has_variants ? null : (float) $product->stock_quantity,
            'min_price'       => $minPrice,
            'category'        => $product->category ? [
                'id'   => $product->category->id,
                'name' => $product->category->name,
            ] : null,
            'variants' => $variants->map(fn($v) => [
                'id'                => $v->id,
                'attribute_summary' => $v->attribute_summary,
                'price'             => (float) $v->price,
                'stock_quantity'    => (float) $v->stock_quantity,
                'is_active'         => $v->is_active,
                'color_hex'         => $v->color_hex,
            ])->values(),
        ];

        if ($detailed) {
            $data['description'] = $product->description;
        }

        return $data;
    }

    private function resolveDeliveryFee(ShopSetting $shop, ?string $zoneName): float
    {
        if (! $zoneName || empty($shop->delivery_zones)) {
            return 0.0;
        }

        foreach ((array) $shop->delivery_zones as $zone) {
            if (isset($zone['name']) && $zone['name'] === $zoneName) {
                return (float) ($zone['fee'] ?? 0);
            }
        }

        return 0.0;
    }
}
