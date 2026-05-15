import type { ShopProduct } from '@/shop/services/shop'

interface Props {
  product           : ShopProduct
  selectedVariantId : number | null
  onSelect          : (variantId: number) => void
}

export default function VariantPicker({ product, selectedVariantId, onSelect }: Props) {
  const activeVariants = product.variants.filter((v) => v.is_active)
  if (activeVariants.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">Options disponibles</span>

      <div className="flex flex-wrap gap-2">
        {activeVariants.map((variant) => {
          const isSelected   = selectedVariantId === variant.id
          const isOutOfStock = variant.stock_quantity <= 0

          return (
            <button
              key={variant.id}
              type="button"
              disabled={isOutOfStock}
              onClick={() => !isOutOfStock && onSelect(variant.id)}
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                isOutOfStock
                  ? 'opacity-40 cursor-not-allowed line-through border-gray-200 bg-white text-gray-700'
                  : isSelected
                  ? 'border-[var(--shop-primary,#111827)] bg-[var(--shop-primary,#111827)]/5'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
              style={isSelected && !isOutOfStock
                ? { color: 'var(--shop-primary, #111827)' }
                : undefined
              }
            >
              {variant.color_hex && (
                <span
                  className="w-4 h-4 rounded-full mr-2 shrink-0 border border-black/10"
                  style={{ backgroundColor: variant.color_hex }}
                />
              )}
              {variant.attribute_summary}
            </button>
          )
        })}
      </div>
    </div>
  )
}
