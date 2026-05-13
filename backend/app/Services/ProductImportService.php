<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use InvalidArgumentException;

class ProductImportService
{
    // Aliases acceptés pour chaque colonne (insensible à la casse)
    private const COL_ALIASES = [
        'name'        => ['nom', 'nom_produit', 'name', 'produit'],
        'sku'         => ['sku', 'code', 'reference', 'ref'],
        'category'    => ['categorie', 'category', 'cat'],
        'price'       => ['prix_vente', 'prix', 'prix_fcfa', 'price', 'tarif'],
        'cost'        => ['prix_achat', 'cost', 'cout', 'cout_achat'],
        'stock'       => ['stock', 'quantite', 'quantité', 'qty', 'qte'],
        'threshold'   => ['seuil_alerte', 'seuil', 'alert_threshold', 'threshold'],
        'unit'        => ['unite', 'unité', 'unit'],
        'description' => ['description', 'desc'],
    ];

    public function __construct(private readonly TenantService $tenantService) {}

    // ─── API publique ─────────────────────────────────────────────────────────

    /**
     * Importe des produits depuis un fichier CSV (séparateur ';', encodage UTF-8).
     *
     * Règles :
     * - Les lignes avec erreur sont ignorées (comptées dans errors[])
     * - Si sku existe et update_existing=false → skipped
     * - Si sku existe et update_existing=true  → mise à jour des champs
     * - Stock initial injecté directement sur stock_quantity (pas de StockMovement)
     *
     * @return array{created: int, updated: int, skipped: int, errors: list<array{row: int, message: string}>}
     */
    public function import(string $filePath, bool $updateExisting = false): array
    {
        $tenantId = $this->tenantService->currentId();

        // ── Normalisation encodage ────────────────────────────────────────────
        // Excel FR exporte souvent en Windows-1252 (Latin-1), pas en UTF-8.
        // On lit tout le contenu, on retire le BOM si présent, puis on convertit.
        $content = file_get_contents($filePath);

        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3); // Strip BOM UTF-8
        }

        if (! mb_check_encoding($content, 'UTF-8')) {
            $content = mb_convert_encoding($content, 'UTF-8', 'Windows-1252');
        }

        // Écrit dans un fichier temporaire pour réutiliser fgetcsv
        $tempPath = tempnam(sys_get_temp_dir(), 'csv_import_');
        file_put_contents($tempPath, $content);
        $handle = fopen($tempPath, 'r');

        // Détection dynamique des colonnes depuis l'en-tête
        $rawHeader = fgetcsv($handle, 0, ';');
        $colMap    = $this->detectColumns(array_map('trim', (array) $rawHeader));

        $created        = 0;
        $updated        = 0;
        $skipped        = 0;
        $errors         = [];
        $rowNum         = 2;
        $categoryCache  = []; // name → id (évite N+1)

        try {
            while (($cols = fgetcsv($handle, 0, ';')) !== false) {
                // Ignore les lignes entièrement vides
                if (count(array_filter(array_map('trim', (array) $cols))) === 0) {
                    $rowNum++;
                    continue;
                }

                try {
                    $data = $this->parseRow($cols, $rowNum, $tenantId, $categoryCache, $colMap);
                } catch (InvalidArgumentException $e) {
                    $errors[] = ['row' => $rowNum, 'message' => $e->getMessage()];
                    $rowNum++;
                    continue;
                }

                // Gestion du SKU existant
                if ($data['sku'] !== '') {
                    $existing = Product::withoutGlobalScopes()
                        ->where('tenant_id', $tenantId)
                        ->where('sku', $data['sku'])
                        ->whereNull('deleted_at')
                        ->first();

                    if ($existing) {
                        if ($updateExisting) {
                            $existing->update([
                                'name'            => $data['name'],
                                'price'           => $data['price'],
                                'cost_price'      => $data['cost_price'],
                                'description'     => $data['description'] ?: null,
                                'unit'            => $data['unit'],
                                'alert_threshold' => $data['alert_threshold'],
                                'category_id'     => $data['category_id'],
                            ]);
                            $updated++;
                        } else {
                            $skipped++;
                        }
                        $rowNum++;
                        continue;
                    }
                }

                // Création du produit
                // alert_threshold omis quand null → le default DB s'applique (5)
                $productData = [
                    'tenant_id'       => $tenantId,
                    'name'            => $data['name'],
                    'sku'             => $data['sku'] ?: null,
                    'category_id'     => $data['category_id'],
                    'price'           => $data['price'],
                    'cost_price'      => $data['cost_price'],
                    'stock_quantity'  => $data['stock'],
                    'unit'            => $data['unit'],
                    'description'     => $data['description'] ?: null,
                    'has_variants'    => false,
                    'is_weight_based' => false,
                    'has_expiry'      => false,
                    'is_active'       => true,
                ];
                if ($data['alert_threshold'] !== null) {
                    $productData['alert_threshold'] = $data['alert_threshold'];
                }
                Product::create($productData);

                $created++;
                $rowNum++;
            }
        } finally {
            fclose($handle);
            @unlink($tempPath);
        }

        return compact('created', 'updated', 'skipped', 'errors');
    }

    // ─── Template CSV ─────────────────────────────────────────────────────────

    public static function templateHeaders(): array
    {
        return ['nom', 'sku', 'categorie', 'prix_vente', 'prix_achat', 'stock', 'seuil_alerte', 'unite', 'description'];
    }

    public static function templateRows(): array
    {
        return [
            ['Coca-Cola 33cl',   'COCA-33',  'Boissons', '600',  '350',  '100', '10', 'pièce', 'Canette 33cl'],
            ['T-shirt blanc M',  'TSH-BL-M', 'Mode',     '5000', '2500', '20',  '5',  'pièce', '100% coton'],
            ['Savon Palmolive',  'SAV-PALM', '',          '500',  '250',  '50',  '5',  'pièce', 'Savon 200g'],
        ];
    }

    // ─── Parsing interne ──────────────────────────────────────────────────────

    /**
     * Mappe les noms de colonnes du CSV (insensible à la casse) vers leurs indices.
     *
     * @return array<string, int|null>
     */
    private function detectColumns(array $header): array
    {
        $normalized = array_map(
            fn($h) => mb_strtolower(preg_replace('/[\s\-\']+/', '_', $h)),
            $header
        );

        $result = [];
        foreach (self::COL_ALIASES as $key => $aliases) {
            $result[$key] = null;
            foreach ($aliases as $alias) {
                $pos = array_search($alias, $normalized, true);
                if ($pos !== false) {
                    $result[$key] = $pos;
                    break;
                }
            }
        }

        return $result;
    }

    /**
     * @throws InvalidArgumentException  Si les données sont invalides
     */
    private function parseRow(array $cols, int $rowNum, int $tenantId, array &$categoryCache, array $colMap): array
    {
        $get = fn(string $key, string $default = '') =>
            isset($colMap[$key]) && $colMap[$key] !== null
                ? trim($cols[$colMap[$key]] ?? $default)
                : $default;

        $name        = $get('name');
        $sku         = $get('sku');
        $categoryStr = $get('category');
        $priceStr    = $get('price');
        $costStr     = $get('cost');
        $stockStr    = $get('stock', '0');
        $threshStr   = $get('threshold');
        $unit        = $get('unit');
        $description = $get('description');

        if ($name === '') {
            throw new InvalidArgumentException("Ligne {$rowNum} : le nom du produit est requis.");
        }

        // Normalise le séparateur décimal (virgule → point, espaces supprimés)
        $priceStr = str_replace([' ', ','], ['', '.'], $priceStr);
        $costStr  = str_replace([' ', ','], ['', '.'], $costStr);

        if (! is_numeric($priceStr) || (float) $priceStr <= 0) {
            throw new InvalidArgumentException("Ligne {$rowNum} : le prix de vente doit être un nombre positif (reçu : « {$priceStr} »).");
        }

        $price     = (float) $priceStr;
        $cost      = ($costStr !== '' && is_numeric($costStr)) ? max(0.0, (float) $costStr) : 0.0;
        $stock     = is_numeric($stockStr) ? max(0.0, (float) $stockStr) : 0.0;
        $threshold = ($threshStr !== '' && is_numeric($threshStr)) ? max(0, (int) $threshStr) : null;

        // Résolution catégorie avec cache (évite N+1 pour des centaines de lignes)
        $categoryId = null;
        if ($categoryStr !== '') {
            if (! array_key_exists($categoryStr, $categoryCache)) {
                $cat = Category::where('tenant_id', $tenantId)
                    ->where('name', $categoryStr)
                    ->first();
                $categoryCache[$categoryStr] = $cat?->id;
            }
            $categoryId = $categoryCache[$categoryStr]; // null si introuvable → ignoré
        }

        return [
            'name'            => $name,
            'sku'             => $sku,
            'category_id'     => $categoryId,
            'price'           => $price,
            'cost_price'      => $cost,
            'stock'           => $stock,
            'alert_threshold' => $threshold,
            'unit'            => $unit,        // chaîne vide OK (NOT NULL en DB)
            'description'     => $description,
        ];
    }
}
