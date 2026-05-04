<?php

namespace App\Services;

use App\Models\AttributeValue;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SaleItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductService
{
    // Relations standard pour les réponses API
    private const EAGER_LOAD = ['category:id,name', 'variants.attributeValues.attribute'];

    // ─── API publique ─────────────────────────────────────────────────────────

    public function create(array $data): Product
    {
        return DB::transaction(function () use ($data) {
            $hasVariants = (bool) ($data['has_variants'] ?? false);

            $product = Product::create([
                'category_id'     => $data['category_id'] ?? null,
                'name'            => $data['name'],
                'description'     => $data['description'] ?? null,
                'image_path'      => $data['image_path'] ?? null,
                'sku'             => $data['sku'] ?? null,
                'barcode'         => $data['barcode'] ?? null,
                'price'           => $data['price'],
                'cost_price'      => $data['cost_price'] ?? 0,
                'has_variants'    => $hasVariants,
                'is_weight_based' => $data['is_weight_based'] ?? false,
                'has_expiry'      => $data['has_expiry'] ?? false,
                // Stock géré par variante quand has_variants=true
                'stock_quantity'  => $hasVariants ? 0 : ($data['stock_quantity'] ?? 0),
                'alert_threshold' => $data['alert_threshold'] ?? null,
                'unit'            => $data['unit'] ?? null,
                'is_active'       => $data['is_active'] ?? true,
            ]);

            if ($hasVariants && ! empty($data['attribute_value_ids'])) {
                $this->createVariantsFromCombinations($product, $data['attribute_value_ids']);
            }

            return $product->load(self::EAGER_LOAD);
        });
    }

    public function update(Product $product, array $data): Product
    {
        return DB::transaction(function () use ($product, $data) {
            // Régénère le slug si le nom change
            if (isset($data['name'])) {
                $data['slug'] = Str::slug($data['name']);
            }

            $product->update($data);

            // Les variantes ne sont jamais écrasées ici — utiliser VariantController
            return $product->fresh(self::EAGER_LOAD);
        });
    }

    /**
     * Génère toutes les combinaisons possibles à partir d'une liste de valeurs d'attribut.
     *
     * Les valeurs sont groupées par attribut parent, puis le produit cartésien
     * est calculé pour obtenir chaque combinaison unique.
     *
     * Exemple : Couleur=[Rouge, Bleu] × Taille=[S, M]
     *   → [[Rouge, S], [Rouge, M], [Bleu, S], [Bleu, M]]
     *
     * @param  int[]  $attributeValueIds
     * @return array<array<array<string,mixed>>>  Tableau de combinaisons (chaque entrée = un tableau de valeurs)
     */
    public function generateVariantCombinations(array $attributeValueIds): array
    {
        $grouped = AttributeValue::whereIn('id', $attributeValueIds)
            ->get()
            ->groupBy('product_attribute_id')
            ->values()
            ->map(fn($values) => $values->values()->toArray())
            ->toArray();

        return $this->cartesianProduct($grouped);
    }

    // ─── Méthodes privées ─────────────────────────────────────────────────────

    private function createVariantsFromCombinations(Product $product, array $attributeValueIds): void
    {
        $combinations = $this->generateVariantCombinations($attributeValueIds);

        foreach ($combinations as $combo) {
            // $combo = tableau de valeurs d'attribut sérialisées (arrays)
            $summary  = collect($combo)->pluck('value')->join(' / ');
            $valueIds = collect($combo)->pluck('id')->toArray();

            $variant = ProductVariant::create([
                'product_id'        => $product->id,
                'attribute_summary' => $summary,
                'price'             => $product->price,
                'cost_price'        => $product->cost_price,
                'stock_quantity'    => 0,
                'is_active'         => true,
            ]);

            $variant->attributeValues()->sync($valueIds);
        }
    }

    /**
     * Produit cartésien d'un tableau de groupes.
     * Chaque groupe est un tableau d'éléments ; le résultat contient
     * toutes les combinaisons possibles (un élément par groupe).
     *
     * @param  list<list<mixed>>  $groups
     * @return list<list<mixed>>
     */
    private function cartesianProduct(array $groups): array
    {
        $result = [[]];

        foreach ($groups as $group) {
            $expanded = [];
            foreach ($result as $existing) {
                foreach ($group as $item) {
                    $expanded[] = array_merge($existing, [$item]);
                }
            }
            $result = $expanded;
        }

        return $result;
    }
}
