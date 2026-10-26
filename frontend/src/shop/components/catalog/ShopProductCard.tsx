import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
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
    const prices = product.variants.filter((v) => v.is_active).map((v) => v.price)
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
    return product.variants.filter((v) => v.is_active).every((v) => v.stock_quantity <= 0)
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
  const navigate   = useNavigate()
  const addItem    = useShopStore((s) => s.addItem)
  const openCart   = useShopStore((s) => s.openCart)
  const currency   = useShopStore((s) => s.shopConfig?.currency ?? 'FCFA')
  const [weightOpen, setWeightOpen] = useState(false)

  const outOfStock   = isOutOfStock(product)
  const priceLabel   = getPriceLabel(product, currency)
  const promoPercent = getPromoPercent(product)
  const lowStock     = isLowStock(product)

  const handleCardClick = () => navigate(`/shop/${slug}/products/${product.uid}`)

  const handleButton = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (outOfStock)              return
    if (product.has_variants)    { navigate(`/shop/${slug}/products/${product.uid}`); return }
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
    if (outOfStock)              return 'Rupture'
    if (product.has_variants)    return 'Voir les options'
    if (product.is_weight_based) return 'Choisir la quantité'
    return 'Ajouter au panier'
  }

  return (
    <>
      <article
        onClick={handleCardClick}
        className="group relative flex flex-col h-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:ring-black/10 cursor-pointer"
      >
        {/* ── Image ─────────────────────────────────────────────────────────── */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-4xl font-bold text-gray-300 select-none">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Overlay rupture */}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
              <span className="rounded-full bg-gray-800/90 px-3 py-1 text-xs font-semibold text-white shadow">
                Rupture de stock
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {promoPercent !== null && !outOfStock && (
              <span className="rounded-lg bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                -{promoPercent}%
              </span>
            )}
            {lowStock && !outOfStock && (
              <span className="rounded-lg bg-orange-400 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                Fin de stock
              </span>
            )}
          </div>

          {/* Bouton panier au survol (desktop) */}
          {!outOfStock && !product.has_variants && !product.is_weight_based && (
            <button
              type="button"
              onClick={handleButton}
              className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--shop-primary,#111827)] text-white shadow-md opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 active:scale-90 hidden sm:flex"
              aria-label="Ajouter au panier"
            >
              <ShoppingCartIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Infos ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          {/* Catégorie */}
          {product.category && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 truncate">
              {product.category.name}
            </span>
          )}

          {/* Nom */}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {/* Sous-titre variantes/poids */}
          {product.has_variants && (
            <span className="text-xs text-gray-400">Plusieurs options disponibles</span>
          )}
          {product.is_weight_based && !product.has_variants && (
            <span className="text-xs text-gray-400">Vendu au {product.unit ?? 'poids'}</span>
          )}

          {/* Prix */}
          <div className="mt-auto flex items-baseline gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-[var(--shop-accent,#111827)]">
              {priceLabel}
            </p>
            {promoPercent !== null && product.compare_at_price !== null && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.compare_at_price)} {currency}
              </span>
            )}
          </div>

          {/* CTA mobile / variantes */}
          {(outOfStock || product.has_variants || product.is_weight_based) && (
            <button
              type="button"
              onClick={handleButton}
              disabled={outOfStock}
              className={`h-9 w-full rounded-xl text-xs font-semibold transition-all duration-150 ${
                outOfStock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[var(--shop-primary,#111827)] text-white hover:opacity-90 active:scale-95'
              }`}
            >
              {buttonLabel()}
            </button>
          )}

          {/* CTA mobile (simple, sans variante) — visible seulement sur mobile */}
          {!outOfStock && !product.has_variants && !product.is_weight_based && (
            <button
              type="button"
              onClick={handleButton}
              className="h-9 w-full rounded-xl text-xs font-semibold bg-[var(--shop-primary,#111827)] text-white hover:opacity-90 active:scale-95 transition-all duration-150 sm:hidden"
            >
              Ajouter au panier
            </button>
          )}
        </div>
      </article>

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
