import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ShopProduct } from '@/shop/services/shop'
import { useShopStore } from '@/shop/store/shopStore'
import WeightInputModal from './WeightInputModal'

interface Props {
  product : ShopProduct
  slug    : string
}

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR')
}

function getPriceLabel(product: ShopProduct): string {
  if (product.has_variants) {
    const prices = product.variants
      .filter((v) => v.is_active)
      .map((v) => v.price)
    if (prices.length === 0) return `${formatPrice(product.price)} FCFA`
    const allSame = prices.every((p) => p === prices[0])
    return allSame
      ? `${formatPrice(prices[0])} FCFA`
      : `À partir de ${formatPrice(Math.min(...prices))} FCFA`
  }
  if (product.is_weight_based) {
    return `${formatPrice(product.price)} FCFA / ${product.unit ?? 'unité'}`
  }
  return `${formatPrice(product.price)} FCFA`
}

function isOutOfStock(product: ShopProduct): boolean {
  if (product.has_variants) {
    return product.variants
      .filter((v) => v.is_active)
      .every((v) => v.stock_quantity <= 0)
  }
  return (product.stock_quantity ?? 0) <= 0
}

export default function ShopProductCard({ product, slug }: Props) {
  const navigate    = useNavigate()
  const addItem     = useShopStore((s) => s.addItem)
  const openCart    = useShopStore((s) => s.openCart)
  const [weightOpen, setWeightOpen] = useState(false)

  const outOfStock  = isOutOfStock(product)
  const priceLabel  = getPriceLabel(product)

  const handleCardClick = () => {
    if (product.has_variants) {
      navigate(`/shop/${slug}/products/${product.id}`)
    }
  }

  const handleButton = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (outOfStock)           return
    if (product.has_variants) { navigate(`/shop/${slug}/products/${product.id}`); return }
    if (product.is_weight_based) { setWeightOpen(true); return }

    addItem({
      product_id     : product.id,
      variant_id     : null,
      product_name   : product.name,
      variant_name   : null,
      image_url      : product.image_url,
      quantity       : 1,
      unit_price     : product.price,
      total          : product.price,
      is_weight_based: false,
      unit           : product.unit,
    })
    openCart()
  }

  const buttonLabel = () => {
    if (outOfStock)              return 'Rupture de stock'
    if (product.has_variants)    return 'Voir les options'
    if (product.is_weight_based) return 'Choisir la quantité'
    return 'Ajouter'
  }

  return (
    <>
      <article
        onClick={handleCardClick}
        className={`group flex flex-col h-full rounded-2xl overflow-hidden bg-white border border-gray-100 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
          product.has_variants ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        {/* ── Image ─────────────────────────────────────────────────────────── */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-4xl font-bold text-gray-300 select-none">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Badge rupture */}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-sm font-medium">Rupture de stock</span>
            </div>
          )}
        </div>

        {/* ── Infos ─────────────────────────────────────────────────────────── */}
        <div className="p-3 flex flex-col gap-1 flex-1">
          {product.category && (
            <span className="text-xs text-gray-400 uppercase tracking-wide truncate">
              {product.category.name}
            </span>
          )}

          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {product.has_variants && (
            <span className="text-xs text-gray-400">Plusieurs options disponibles</span>
          )}
          {product.is_weight_based && !product.has_variants && (
            <span className="text-xs text-gray-400">Vendu au {product.unit ?? 'poids'}</span>
          )}

          <p
            className="text-base font-bold mt-1"
            style={{ color: 'var(--shop-primary, #111827)' }}
          >
            {priceLabel}
          </p>

          {/* ── Bouton ────────────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleButton}
            disabled={outOfStock}
            className={`mt-auto h-10 w-full rounded-xl text-sm font-medium transition-all duration-150 ${
              outOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'text-white hover:opacity-90 active:scale-95'
            }`}
            style={outOfStock ? undefined : { backgroundColor: 'var(--shop-primary, #111827)' }}
          >
            {buttonLabel()}
          </button>
        </div>
      </article>

      {/* WeightInputModal — monté hors du article pour éviter le stopPropagation */}
      {product.is_weight_based && (
        <WeightInputModal
          product={product}
          isOpen={weightOpen}
          onClose={() => setWeightOpen(false)}
        />
      )}
    </>
  )
}
