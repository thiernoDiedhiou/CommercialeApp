import type { ShopProduct } from '@/shop/services/shop'

interface Props {
  product           : ShopProduct
  selectedVariantId : number | null
  quantity          : number
  onQuantityChange  : (qty: number) => void
  onAddToCart       : () => void
}

function formatPrice(price: number): string {
  return Math.round(price).toLocaleString('fr-FR')
}

export default function AddToCartBar({
  product,
  selectedVariantId,
  quantity,
  onQuantityChange,
  onAddToCart,
}: Props) {
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId)
  const price           = selectedVariant?.price ?? product.price

  const stockQty = selectedVariant
    ? selectedVariant.stock_quantity
    : product.has_variants ? null : (product.stock_quantity ?? 0)

  const isOutOfStock    = stockQty !== null && stockQty <= 0
  const needsVariant    = product.has_variants && !selectedVariantId
  const isDisabled      = isOutOfStock || needsVariant

  const buttonLabel = needsVariant
    ? 'Sélectionnez une option'
    : isOutOfStock
    ? 'Rupture de stock'
    : 'Ajouter au panier'

  return (
    <div className="sticky bottom-0 lg:static bg-white border-t border-gray-100 lg:border-t-0 p-4 lg:p-0 z-30">
      {/* Prix */}
      <p
        className="text-2xl font-bold mb-3"
        style={{ color: 'var(--shop-primary, #111827)' }}
      >
        {formatPrice(price * quantity)} FCFA
      </p>

      {/* Quantité + Bouton */}
      <div className="flex items-center gap-3">
        {/* Sélecteur quantité */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            aria-label="Diminuer la quantité"
            className="h-12 w-12 rounded-xl bg-gray-100 text-gray-700 text-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            −
          </button>
          <span className="w-10 text-center text-base font-semibold text-gray-900">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => onQuantityChange(Math.min(99, quantity + 1))}
            aria-label="Augmenter la quantité"
            className="h-12 w-12 rounded-xl bg-gray-100 text-gray-700 text-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            +
          </button>
        </div>

        {/* Bouton ajouter */}
        <button
          type="button"
          onClick={onAddToCart}
          disabled={isDisabled}
          className="flex-1 h-12 rounded-xl text-white font-semibold text-base transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          style={{ backgroundColor: 'var(--shop-primary, #111827)' }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}
