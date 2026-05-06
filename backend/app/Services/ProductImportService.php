<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use InvalidArgumentException;

class ProductImportService
{
    // Index des colonnes CSV (0-based)
    private const COL_NAME        = 0;
    private const COL_SKU         = 1;
    private const COL_CATEGORY    = 2;
    private const COL_PRICE       = 3;
    private const COL_COST        = 4;
    private const COL_STOCK       = 5;
    private const COL_THRESHOLD   = 6;
    private const COL_UNIT        = 7;
    private const COL_DESCRIPTION = 8;

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
        $handle   = fopen($filePath, 'r');

        // Retire le BOM UTF-8 si présent
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        // Ignore l'en-tête
        fgetcsv($handle, 0, ';');

        $created        = 0;
        $updated        = 0;
        $skipped        = 0;
        $errors         = [];
        $rowNum         = 2;
        $categoryCache  = []; // name → id (évite N+1)

        while (($cols = fgetcsv($handle, 0, ';')) !== false) {
            // Ignore les lignes entièrement vides
            if (count(array_filter(array_map('trim', (array) $cols))) === 0) {
                $rowNum++;
                continue;
            }

            try {
                $data = $this->parseRow($cols, $rowNum, $tenantId, $categoryCache);
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

        fclose($handle);

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
     * @throws InvalidArgumentException  Si les données sont invalides
     */
    private function parseRow(array $cols, int $rowNum, int $tenantId, array &$categoryCache): array
    {
        $name        = trim($cols[self::COL_NAME]        ?? '');
        $sku         = trim($cols[self::COL_SKU]         ?? '');
        $categoryStr = trim($cols[self::COL_CATEGORY]    ?? '');
        $priceStr    = trim($cols[self::COL_PRICE]       ?? '');
        $costStr     = trim($cols[self::COL_COST]        ?? '');
        $stockStr    = trim($cols[self::COL_STOCK]       ?? '0');
        $threshStr   = trim($cols[self::COL_THRESHOLD]   ?? '');
        $unit        = trim($cols[self::COL_UNIT]        ?? '');
        $description = trim($cols[self::COL_DESCRIPTION] ?? '');

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
