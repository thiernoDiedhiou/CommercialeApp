<?php

use App\Models\Category;
use App\Models\Product;
use App\Services\ProductImportService;
use App\Services\TenantService;

beforeEach(function () {
    [$this->tenant, $this->user] = $this->createTenantWithUser();
    app(TenantService::class)->setCurrentTenant($this->tenant);
    $this->actingAs($this->user);
    $this->service = app(ProductImportService::class);
});

// ─── Helper local ──────────────────────────────────────────────────────────

/**
 * Crée un fichier CSV temporaire avec les lignes données et retourne son chemin.
 * Le fichier est supprimé automatiquement par le garbage collector en fin de test.
 */
function makeCsvFile(array $rows, bool $withBom = false): string
{
    $path = tempnam(sys_get_temp_dir(), 'import_test_');
    $out  = fopen($path, 'w');
    if ($withBom) {
        fwrite($out, "\xEF\xBB\xBF");
    }
    // En-tête
    fputcsv($out, ['nom', 'sku', 'categorie', 'prix_vente', 'prix_achat', 'stock', 'seuil_alerte', 'unite', 'description'], ';');
    foreach ($rows as $row) {
        fputcsv($out, $row, ';');
    }
    fclose($out);
    return $path;
}

// ─── Création de produits ─────────────────────────────────────────────────

it('creates products from valid CSV rows', function () {
    $csv = makeCsvFile([
        ['Coca-Cola 33cl', 'COCA-33', '', '600', '350', '100', '10', 'pièce', 'Canette'],
        ['T-shirt blanc',  'TSH-01',  '', '5000', '2500', '20', '5', 'pièce', ''],
    ]);

    $result = $this->service->import($csv);

    expect($result['created'])->toBe(2);
    expect($result['errors'])->toBeEmpty();
    expect(Product::count())->toBe(2);
});

it('returns correct created count', function () {
    $csv = makeCsvFile([
        ['Produit A', 'SKU-A', '', '1000', '500', '0', '', 'pièce', ''],
    ]);

    $result = $this->service->import($csv);

    expect($result['created'])->toBe(1);
    expect($result['updated'])->toBe(0);
    expect($result['skipped'])->toBe(0);
});

it('sets product fields correctly from CSV', function () {
    $csv = makeCsvFile([
        ['Mon Produit', 'MP-001', '', '3500', '1500', '50', '5', 'kg', 'Description test'],
    ]);

    $this->service->import($csv);
    $product = Product::first();

    expect($product->name)->toBe('Mon Produit');
    expect($product->sku)->toBe('MP-001');
    expect((float) $product->price)->toBe(3500.0);
    expect((float) $product->cost_price)->toBe(1500.0);
    expect((float) $product->stock_quantity)->toBe(50.0);
    expect($product->alert_threshold)->toBe(5);
    expect($product->unit)->toBe('kg');
});

// ─── Gestion des SKU existants ─────────────────────────────────────────────

it('skips existing SKU when update_existing is false', function () {
    Product::factory()->create([
        'tenant_id' => $this->tenant->id,
        'sku'       => 'EXISTING',
        'price'     => 1000,
        'cost_price'=> 500,
    ]);

    $csv = makeCsvFile([
        ['Produit Modifié', 'EXISTING', '', '9999', '5000', '10', '', 'pièce', ''],
    ]);

    $result = $this->service->import($csv, updateExisting: false);

    expect($result['skipped'])->toBe(1);
    expect($result['created'])->toBe(0);
    expect((float) Product::where('sku', 'EXISTING')->first()->price)->toBe(1000.0); // pas changé
});

it('updates existing SKU when update_existing is true', function () {
    Product::factory()->create([
        'tenant_id' => $this->tenant->id,
        'sku'       => 'UPD-001',
        'price'     => 1000,
        'cost_price'=> 500,
        'name'      => 'Ancien nom',
    ]);

    $csv = makeCsvFile([
        ['Nouveau nom', 'UPD-001', '', '2000', '800', '30', '5', 'pièce', ''],
    ]);

    $result = $this->service->import($csv, updateExisting: true);

    expect($result['updated'])->toBe(1);
    expect($result['created'])->toBe(0);
    $product = Product::where('sku', 'UPD-001')->first();
    expect($product->name)->toBe('Nouveau nom');
    expect((float) $product->price)->toBe(2000.0);
});

// ─── Validation et erreurs ────────────────────────────────────────────────

it('reports an error for a row with missing name', function () {
    $csv = makeCsvFile([
        ['', 'SKU-X', '', '1000', '', '', '', '', ''],
    ]);

    $result = $this->service->import($csv);

    expect($result['created'])->toBe(0);
    expect($result['errors'])->toHaveCount(1);
    expect($result['errors'][0]['row'])->toBe(2);
    expect($result['errors'][0]['message'])->toContain('nom');
});

it('reports an error for a row with invalid price', function () {
    $csv = makeCsvFile([
        ['Produit Test', 'SKU-P', '', 'INVALIDE', '', '', '', '', ''],
    ]);

    $result = $this->service->import($csv);

    expect($result['created'])->toBe(0);
    expect($result['errors'])->toHaveCount(1);
    expect($result['errors'][0]['message'])->toContain('prix');
});

it('reports an error for a row with zero price', function () {
    $csv = makeCsvFile([
        ['Produit Gratuit', '', '', '0', '', '', '', '', ''],
    ]);

    $result = $this->service->import($csv);

    expect($result['errors'])->toHaveCount(1);
});

it('skips valid rows even when some rows have errors', function () {
    $csv = makeCsvFile([
        ['Produit Valide', 'VAL-001', '', '1000', '', '', '', '', ''],
        ['', 'ERR-001', '', '500', '', '', '', '', ''],          // erreur — nom vide
        ['Produit Valide 2', 'VAL-002', '', '2000', '', '', '', '', ''],
    ]);

    $result = $this->service->import($csv);

    expect($result['created'])->toBe(2);
    expect($result['errors'])->toHaveCount(1);
    expect($result['errors'][0]['row'])->toBe(3);
});

// ─── Résolution de catégorie ──────────────────────────────────────────────

it('assigns category_id when category name matches', function () {
    $category = Category::create(['tenant_id' => $this->tenant->id, 'name' => 'Boissons', 'slug' => 'boissons']);

    $csv = makeCsvFile([
        ["Jus d'orange", 'JUS-01', 'Boissons', '500', '200', '50', '5', 'pièce', ''],
    ]);

    $this->service->import($csv);
    $product = Product::first();

    expect($product->category_id)->toBe($category->id);
});

it('leaves category_id null when category name is not found', function () {
    $csv = makeCsvFile([
        ['Produit', 'P-001', 'Catégorie Inexistante', '1000', '', '', '', '', ''],
    ]);

    $this->service->import($csv);

    expect(Product::first()->category_id)->toBeNull();
});

// ─── Robustesse format ────────────────────────────────────────────────────

it('handles CSV with UTF-8 BOM', function () {
    $csv = makeCsvFile([
        ['Produit BOM', 'BOM-01', '', '1000', '', '', '', '', ''],
    ], withBom: true);

    $result = $this->service->import($csv);

    expect($result['created'])->toBe(1);
    expect($result['errors'])->toBeEmpty();
});

it('handles comma as decimal separator in prices', function () {
    $csv = makeCsvFile([
        ['Produit virgule', 'V-001', '', '1 500,50', '750,25', '', '', '', ''],
    ]);

    $this->service->import($csv);
    $product = Product::first();

    expect((float) $product->price)->toBe(1500.50);
    expect((float) $product->cost_price)->toBe(750.25);
});

it('ignores completely empty lines', function () {
    $csv = makeCsvFile([
        ['Produit A', 'SKU-A', '', '1000', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''], // ligne vide
        ['Produit B', 'SKU-B', '', '2000', '', '', '', '', ''],
    ]);

    $result = $this->service->import($csv);

    expect($result['created'])->toBe(2);
    expect($result['errors'])->toBeEmpty();
});

it('scopes products to current tenant', function () {
    $csv = makeCsvFile([
        ['Produit Tenant', 'T-001', '', '1000', '', '', '', '', ''],
    ]);

    $this->service->import($csv);
    $product = Product::first();

    expect($product->tenant_id)->toBe($this->tenant->id);
});

// ─── Template ─────────────────────────────────────────────────────────────

it('provides template headers', function () {
    $headers = ProductImportService::templateHeaders();

    expect($headers)->toContain('nom');
    expect($headers)->toContain('prix_vente');
    expect($headers)->toContain('sku');
});

it('provides template rows with valid data', function () {
    $rows = ProductImportService::templateRows();

    expect($rows)->not->toBeEmpty();
    // Chaque ligne doit avoir au moins nom + prix_vente non vides
    foreach ($rows as $row) {
        expect($row[0])->not->toBe(''); // nom
        expect($row[3])->not->toBe(''); // prix_vente
    }
});
