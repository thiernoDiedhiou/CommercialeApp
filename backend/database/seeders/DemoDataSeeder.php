<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Services\SaleService;
use App\Services\StockService;
use App\Services\TenantService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Auth;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'demo')->firstOrFail();
        $admin  = User::where('tenant_id', $tenant->id)->where('email', 'admin@demo.sn')->firstOrFail();

        // Initialise le contexte tenant + auth (requis par StockService + SaleService)
        app(TenantService::class)->setCurrentTenant($tenant);
        Auth::loginUsingId($admin->id);

        $this->command->info('Seeding données démo…');

        $categories = $this->seedCategories($tenant);
        $products   = $this->seedProducts($tenant, $categories);
        $this->seedStock($products);
        $customers  = $this->seedCustomers($tenant);
        $this->seedSales($admin, $products, $customers);

        $this->command->info('✓ Données démo insérées avec succès.');
    }

    // ─── Catégories ───────────────────────────────────────────────────────────

    private function seedCategories(Tenant $tenant): array
    {
        $names = ['Alimentation', 'Boissons', 'Hygiène', 'Téléphonie', 'Divers'];

        $result = [];
        foreach ($names as $name) {
            $result[$name] = Category::firstOrCreate(
                ['tenant_id' => $tenant->id, 'slug' => \Illuminate\Support\Str::slug($name)],
                ['name' => $name, 'parent_id' => null],
            );
        }

        return $result;
    }

    // ─── Produits ─────────────────────────────────────────────────────────────

    private function seedProducts(Tenant $tenant, array $cats): array
    {
        $defs = [
            // Alimentation
            ['name' => 'Riz parfumé 5kg',       'cat' => 'Alimentation', 'price' => 4500,  'cost' => 3200,  'sku' => 'RIZ-5KG',   'unit' => 'sac',  'alert' => 10],
            ['name' => 'Huile végétale 1L',      'cat' => 'Alimentation', 'price' => 1500,  'cost' => 1000,  'sku' => 'HUILE-1L',  'unit' => 'L',    'alert' => 20],
            ['name' => 'Sucre blanc 1kg',        'cat' => 'Alimentation', 'price' => 800,   'cost' => 550,   'sku' => 'SUCRE-1KG', 'unit' => 'kg',   'alert' => 30],
            ['name' => 'Farine de blé 1kg',      'cat' => 'Alimentation', 'price' => 700,   'cost' => 480,   'sku' => 'FAR-1KG',   'unit' => 'kg',   'alert' => 20],
            ['name' => 'Lait concentré Nestlé',  'cat' => 'Alimentation', 'price' => 500,   'cost' => 340,   'sku' => 'LAIT-NST',  'unit' => 'boîte','alert' => 15],
            // Boissons
            ['name' => 'Eau minérale 1.5L',      'cat' => 'Boissons',     'price' => 500,   'cost' => 300,   'sku' => 'EAU-1L5',   'unit' => 'L',    'alert' => 24],
            ['name' => 'Jus Pur Fruit 33cl',     'cat' => 'Boissons',     'price' => 700,   'cost' => 450,   'sku' => 'JUS-33CL',  'unit' => 'cl',   'alert' => 12],
            ['name' => 'Coca-Cola 33cl',         'cat' => 'Boissons',     'price' => 600,   'cost' => 380,   'sku' => 'COCA-33CL', 'unit' => 'cl',   'alert' => 12],
            // Hygiène
            ['name' => 'Savon Camay 100g',       'cat' => 'Hygiène',      'price' => 500,   'cost' => 300,   'sku' => 'SAV-CMY',   'unit' => '',   'alert' => 10],
            ['name' => 'Dentifrice Colgate 75ml','cat' => 'Hygiène',      'price' => 1200,  'cost' => 800,   'sku' => 'DENT-CLG',  'unit' => '',   'alert' => 8],
            ['name' => 'Lessive Omo 500g',       'cat' => 'Hygiène',      'price' => 1500,  'cost' => 1000,  'sku' => 'LES-OMO',   'unit' => '',   'alert' => 10],
            // Téléphonie
            ['name' => 'Recharge Orange 1000F',  'cat' => 'Téléphonie',   'price' => 1000,  'cost' => 950,   'sku' => 'RECH-ORA',  'unit' => '',   'alert' => 20],
            ['name' => 'Recharge Free 500F',     'cat' => 'Téléphonie',   'price' => 500,   'cost' => 475,   'sku' => 'RECH-FRE',  'unit' => '',   'alert' => 30],
            ['name' => 'Câble USB-C 1m',         'cat' => 'Téléphonie',   'price' => 3500,  'cost' => 1800,  'sku' => 'CABLE-USBC','unit' => '',   'alert' => 5],
            // Divers — un produit avec stock faible pour tester l'alerte
            ['name' => 'Cahier 100 pages',       'cat' => 'Divers',       'price' => 500,   'cost' => 280,   'sku' => 'CAH-100P',  'unit' => '',   'alert' => 10],
        ];

        $result = [];
        foreach ($defs as $def) {
            $product = Product::firstOrCreate(
                ['tenant_id' => $tenant->id, 'sku' => $def['sku']],
                [
                    'name'            => $def['name'],
                    'category_id'     => $cats[$def['cat']]->id,
                    'price'           => $def['price'],
                    'cost_price'      => $def['cost'],
                    'unit'            => $def['unit'],
                    'alert_threshold' => $def['alert'],
                    'stock_quantity'  => 0,
                    'has_variants'    => false,
                    'is_active'       => true,
                ],
            );
            $result[] = $product;
        }

        return $result;
    }

    // ─── Stock initial ────────────────────────────────────────────────────────

    private function seedStock(array $products): void
    {
        $stockService = app(StockService::class);

        // Quantités initiales (index = même ordre que $defs)
        $quantities = [50, 60, 80, 70, 48, 72, 36, 60, 40, 30, 25, 50, 80, 20, 8];

        foreach ($products as $i => $product) {
            // Ignore si déjà en stock (idempotent)
            if ($product->stock_quantity > 0) {
                continue;
            }

            $qty = $quantities[$i] ?? 20;

            $stockService->adjust(
                product:  $product,
                type:     'in',
                quantity: $qty,
                source:   'seeder',
                notes:    'Stock initial démo',
                unitCost: (float) $product->cost_price,
            );
        }
    }

    // ─── Clients ──────────────────────────────────────────────────────────────

    private function seedCustomers(Tenant $tenant): array
    {
        $defs = [
            ['name' => 'Fatou Diallo',    'phone' => '77 123 45 67', 'address' => 'Médina, Dakar'],
            ['name' => 'Moussa Ndiaye',   'phone' => '78 234 56 78', 'address' => 'Grand Yoff, Dakar'],
            ['name' => 'Aïssatou Sow',    'phone' => '76 345 67 89', 'address' => 'Pikine'],
            ['name' => 'Ibrahima Fall',   'phone' => '70 456 78 90', 'address' => 'Guédiawaye'],
            ['name' => 'Mariama Bâ',      'phone' => '77 567 89 01', 'address' => 'Thiès'],
            ['name' => 'Cheikh Diop',     'phone' => '78 678 90 12', 'address' => 'Plateau, Dakar'],
            ['name' => 'Ndèye Sarr',      'phone' => '76 789 01 23', 'address' => 'Parcelles Assainies'],
        ];

        $result = [];
        foreach ($defs as $def) {
            $result[] = Customer::firstOrCreate(
                ['tenant_id' => $tenant->id, 'phone' => $def['phone']],
                ['name' => $def['name'], 'address' => $def['address'], 'is_active' => true],
            );
        }

        return $result;
    }

    // ─── Ventes ───────────────────────────────────────────────────────────────

    private function seedSales(User $admin, array $products, array $customers): void
    {
        $saleService = app(SaleService::class);

        // Si des ventes existent déjà, on skip
        if (\App\Models\Sale::where('tenant_id', $admin->tenant_id)->exists()) {
            $this->command->info('  → Ventes déjà présentes, skip.');
            return;
        }

        // Scénarios de ventes réalistes sur les 7 derniers jours
        $scenarios = [
            // Ventes d'aujourd'hui
            [
                'offset_days' => 0,
                'customer'    => 0,
                'items'       => [
                    ['product' => 0, 'qty' => 2],   // Riz 5kg ×2
                    ['product' => 1, 'qty' => 1],   // Huile ×1
                    ['product' => 2, 'qty' => 2],   // Sucre ×2
                ],
                'payment' => ['cash', 14600],
            ],
            [
                'offset_days' => 0,
                'customer'    => 1,
                'items'       => [
                    ['product' => 5, 'qty' => 6],   // Eau ×6
                    ['product' => 7, 'qty' => 3],   // Coca ×3
                ],
                'payment' => ['mobile_money', 4800],
            ],
            [
                'offset_days' => 0,
                'customer'    => null,
                'items'       => [
                    ['product' => 8, 'qty' => 3],   // Savon ×3
                    ['product' => 9, 'qty' => 1],   // Dentifrice
                    ['product' => 10,'qty' => 1],   // Lessive
                ],
                'payment' => ['cash', 4200],
            ],
            [
                'offset_days' => 0,
                'customer'    => 2,
                'items'       => [
                    ['product' => 11,'qty' => 3],   // Recharge Orange ×3
                    ['product' => 12,'qty' => 5],   // Recharge Free ×5
                ],
                'payment' => ['mobile_money', 5500],
                'partial'  => true, // paiement partiel → paiement en attente
            ],
            // Hier
            [
                'offset_days' => 1,
                'customer'    => 3,
                'items'       => [
                    ['product' => 0, 'qty' => 1],
                    ['product' => 3, 'qty' => 2],
                    ['product' => 4, 'qty' => 4],
                ],
                'payment' => ['cash', 8200],
            ],
            [
                'offset_days' => 1,
                'customer'    => null,
                'items'       => [
                    ['product' => 13,'qty' => 1],  // Câble USB-C
                    ['product' => 11,'qty' => 2],  // Recharge Orange ×2
                ],
                'payment' => ['cash', 5500],
            ],
            [
                'offset_days' => 1,
                'customer'    => 4,
                'items'       => [
                    ['product' => 6, 'qty' => 4],   // Jus ×4
                    ['product' => 5, 'qty' => 12],  // Eau ×12
                ],
                'payment' => ['mobile_money', 8800],
            ],
            // J-2
            [
                'offset_days' => 2,
                'customer'    => 5,
                'items'       => [
                    ['product' => 0, 'qty' => 3],
                    ['product' => 1, 'qty' => 2],
                    ['product' => 2, 'qty' => 3],
                    ['product' => 3, 'qty' => 3],
                ],
                'payment' => ['cash', 22500],
                'discount' => ['fixed', 500],
            ],
            [
                'offset_days' => 2,
                'customer'    => null,
                'items'       => [
                    ['product' => 14,'qty' => 5],   // Cahier ×5
                    ['product' => 8, 'qty' => 6],   // Savon ×6
                ],
                'payment' => ['cash', 5500],
            ],
            // J-3
            [
                'offset_days' => 3,
                'customer'    => 6,
                'items'       => [
                    ['product' => 9, 'qty' => 2],
                    ['product' => 10,'qty' => 3],
                    ['product' => 8, 'qty' => 4],
                ],
                'payment' => ['mobile_money', 9900],
            ],
            [
                'offset_days' => 3,
                'customer'    => 0,
                'items'       => [
                    ['product' => 4, 'qty' => 6],
                    ['product' => 5, 'qty' => 6],
                ],
                'payment' => ['cash', 6000],
            ],
            // J-4
            [
                'offset_days' => 4,
                'customer'    => 1,
                'items'       => [
                    ['product' => 0, 'qty' => 2],
                    ['product' => 2, 'qty' => 4],
                    ['product' => 1, 'qty' => 2],
                ],
                'payment' => ['cash', 15200],
                'discount' => ['percent', 5],
            ],
            [
                'offset_days' => 4,
                'customer'    => null,
                'items'       => [
                    ['product' => 12,'qty' => 10],  // Recharge Free ×10
                    ['product' => 11,'qty' => 4],   // Recharge Orange ×4
                ],
                'payment' => ['mobile_money', 9000],
            ],
            // J-5
            [
                'offset_days' => 5,
                'customer'    => 3,
                'items'       => [
                    ['product' => 7, 'qty' => 6],   // Coca ×6
                    ['product' => 6, 'qty' => 6],   // Jus ×6
                    ['product' => 5, 'qty' => 12],  // Eau ×12
                ],
                'payment' => ['cash', 13200],
            ],
            [
                'offset_days' => 5,
                'customer'    => 4,
                'items'       => [
                    ['product' => 13,'qty' => 2],   // Câble USB-C ×2
                ],
                'payment' => ['card', 7000],
            ],
            // J-6
            [
                'offset_days' => 6,
                'customer'    => 2,
                'items'       => [
                    ['product' => 0, 'qty' => 4],
                    ['product' => 3, 'qty' => 3],
                    ['product' => 4, 'qty' => 6],
                ],
                'payment' => ['cash', 23100],
                'discount' => ['fixed', 900],
            ],
            [
                'offset_days' => 6,
                'customer'    => null,
                'items'       => [
                    ['product' => 9, 'qty' => 2],
                    ['product' => 8, 'qty' => 5],
                    ['product' => 14,'qty' => 8],
                ],
                'payment' => ['cash', 8900],
            ],
        ];

        foreach ($scenarios as $s) {
            try {
                $saleAt  = now()->subDays($s['offset_days'])->setTime(rand(8, 18), rand(0, 59));
                $customer = isset($s['customer']) ? ($customers[$s['customer']] ?? null) : null;

                $items = array_map(function ($item) use ($products) {
                    $product = $products[$item['product']];
                    return [
                        'product_id' => $product->id,
                        'quantity'   => $item['qty'],
                        'unit_price' => (float) $product->price,
                        'discount'   => 0,
                    ];
                }, $s['items']);

                [$method, $amount] = $s['payment'];

                // Montant partiel si 'partial' = true (→ paiement en attente)
                $paidAmount = isset($s['partial']) && $s['partial']
                    ? (int) ($amount * 0.6)
                    : $amount;

                $discountType  = null;
                $discountValue = 0;
                if (isset($s['discount'])) {
                    [$discountType, $discountValue] = $s['discount'];
                }

                $sale = $saleService->create([
                    'customer_id'    => $customer?->id,
                    'items'          => $items,
                    'discount_type'  => $discountType,
                    'discount_value' => $discountValue,
                    'payments'       => [
                        ['method' => $method, 'amount' => $paidAmount],
                    ],
                ], $admin);

                // Rétro-date la vente (created_at + confirmed_at)
                \App\Models\Sale::where('id', $sale->id)->update([
                    'created_at'   => $saleAt,
                    'confirmed_at' => $saleAt,
                ]);

            } catch (\Throwable $e) {
                $this->command->warn("  ⚠ Vente skippée : {$e->getMessage()}");
            }
        }

        $this->command->info('  ✓ '.count($scenarios).' ventes créées.');
    }
}
