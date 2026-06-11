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

function getPriceLabel(product: ShopProduct, currency: string): string {
  if (product.has_variants) {
    const prices = product.variants
      .filter((v) => v.is_active)
      .map((v) => v.price)
    if (prices.length === 0) return `${formatPrice(product.price)} ${currency}`
    const allSame = prices.every((p) => p === prices[0])
    return allSame
      ? `${formatPrice(prices[0])} ${currency}`
      : `À partir de ${formatPrice(Math.min(...prices))} ${currency}`
  }
  if (product.is_weight_based) {
    return `${formatPrice(product.price)} ${currency} / ${product.unit ?? 'unité'}`
  }
  return `${formatPrice(product.price)} ${currency}`
}

function isOutOfStock(product: ShopProduct): boolean {
  if (product.has_variants) {
    return product.variants
      .filter((v) => v.is_active)
      .every((v) => v.stock_quantity <= 0)
  }
  return (product.stock_quantity ?? 0) <= 0
}

function getPromoPercent(product: ShopProduct): number | null {
  if (!product.compare_at_price || product.compare_at_price <= product.price) return null
  return Math.round((1 - product.price / product.compare_at_price) * 100)
}

function isLowStock(product: ShopProduct): boolean {
  if (product.has_variants) return false
  const qty = product.stock_quantity ?? 0
  const threshold = product.alert_threshold
  return threshold !== null && qty > 0 && qty <= threshold
}

export default function ShopProductCard({ product, slug }: Props) {
  const navigate    = useNavigate()
  const addItem     = useShopStore((s) => s.addItem)
  const openCart    = useShopStore((s) => s.openCart)
  const currency    = useShopStore((s) => s.shopConfig?.currency ?? 'FCFA')
  const [weightOpen, setWeightOpen] = useState(false)

  const outOfStock  = isOutOfStock(product)
  const priceLabel  = getPriceLabel(product, currency)
  const promoPercent = getPromoPercent(product)
  const lowStock    = isLowStock(product)

  const handleCardClick = () => {
    navigate(`/shop/${slug}/products/${product.id}`)
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
      stock_quantity : product.stock_quantity ?? 0,
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
        className="group flex flex-col h-full rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
      >
        {/* ── Image ─────────────────────────────────────────────────────────── */}
        <div className="relative aspect-square bg-white p-4 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-4xl font-bold text-gray-300 select-none">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Badge promo */}
          {promoPercent !== null && !outOfStock && (
            <div className="absolute top-2 left-2 rounded-lg bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
              -{promoPercent}%
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

          {/* Prix + prix barré */}
          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <p className="text-base font-bold text-[var(--shop-accent,#111827)]">
              {priceLabel}
            </p>
            {promoPercent !== null && product.compare_at_price !== null && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.compare_at_price)} {currency}
              </span>
            )}
          </div>

          {/* Badge stock faible */}
          {lowStock && (
            <p className="text-xs font-medium text-orange-500">
              Plus que {product.stock_quantity} en stock
            </p>
          )}

          {/* ── Bouton ────────────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleButton}
            disabled={outOfStock}
            className={`mt-auto h-10 w-full rounded-xl text-sm font-medium transition-all duration-150 ${
              outOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'text-white hover:opacity-90 active:scale-95 bg-[var(--shop-accent,#111827)]'
            }`}
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
