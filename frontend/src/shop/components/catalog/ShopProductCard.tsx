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
  const qty       = product.stock_quantity ?? 0
  const threshold = product.alert_threshold
  return threshold !== null && qty > 0 && qty <= threshold
}

/** Extrait des "chips" depuis la description courte ou les variantes */
function getSpecChips(product: ShopProduct): string[] {
  // Pour les produits à variantes : attributs uniques des variantes actives
  if (product.has_variants) {
    const attrs = new Set<string>()
    product.variants
      .filter((v) => v.is_active)
      .forEach((v) => {
        v.attribute_summary?.split(' / ').forEach((a) => attrs.add(a.trim()))
      })
    return [...attrs].slice(0, 4)
  }
  // Pour les produits simples : découpe la description sur les séparateurs courants
  const desc = product.description?.trim()
  if (!desc || desc.length > 120) return []
  // Séparateurs possibles : " • " / " · " / " | " / " / " / ","
  const parts = desc.split(/\s*[•·|/,]\s*/).map((s) => s.trim()).filter((s) => s.length > 0 && s.length < 30)
  return parts.slice(0, 4)
}

const GROTESK: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }
const JAKARTA: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" }

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
  const chips        = getSpecChips(product)

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
    if (outOfStock)              return 'Rupture de stock'
    if (product.has_variants)    return 'Voir les options'
    if (product.is_weight_based) return 'Choisir la quantité'
    return 'Ajouter au panier'
  }

  return (
    <>
      <article
        onClick={handleCardClick}
        className="group relative flex flex-col h-full overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-slate-300 cursor-pointer"
      >
        {/* ── Zone image ───────────────────────────────────────────────────────── */}
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl font-bold text-slate-200 select-none" style={GROTESK}>
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Overlay rupture */}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-[2px]">
              <span className="rounded-full bg-slate-800/90 px-3 py-1 text-xs font-bold text-white shadow" style={JAKARTA}>
                Rupture de stock
              </span>
            </div>
          )}

          {/* Badge promo — haut gauche */}
          {promoPercent !== null && !outOfStock && (
            <span
              className="absolute top-2.5 left-2.5 rounded px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm"
              style={{ ...GROTESK, background: '#ef4444' }}
            >
              -{promoPercent}%
            </span>
          )}

          {/* Badge stock — haut droite */}
          {!outOfStock && !lowStock && (
            <span
              className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm"
              style={JAKARTA}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              En stock
            </span>
          )}
          {lowStock && !outOfStock && (
            <span
              className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-semibold text-orange-700 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm"
              style={JAKARTA}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              Plus que {product.stock_quantity}
            </span>
          )}
        </div>

        {/* ── Infos produit ────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-1 p-3 pt-2.5">

          {/* Catégorie — label-caps style */}
          {product.category && (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 truncate"
              style={JAKARTA}
            >
              {product.category.name}
              {product.is_weight_based && ` • Vendu au ${product.unit ?? 'poids'}`}
            </span>
          )}

          {/* Nom du produit — Space Grotesk, headline-sm */}
          <h3
            className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-[var(--shop-primary,#006948)] transition-colors"
            style={GROTESK}
          >
            {product.name}
          </h3>

          {/* Spec chips — description courte ou attributs variantes */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {chips.map((chip, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] leading-tight"
                  style={JAKARTA}
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          {/* Prix — Space Grotesk, price-display */}
          <div className="mt-auto flex items-baseline gap-1.5 flex-wrap pt-2">
            <p
              className="font-bold text-slate-900 text-[15px] leading-snug"
              style={GROTESK}
            >
              {priceLabel}
            </p>
            {promoPercent !== null && product.compare_at_price !== null && (
              <span className="text-xs text-slate-400 line-through" style={JAKARTA}>
                {formatPrice(product.compare_at_price)} {currency}
              </span>
            )}
          </div>

          {/* CTA — toujours visible, pleine largeur */}
          <button
            type="button"
            onClick={handleButton}
            disabled={outOfStock}
            className={`mt-2 h-10 w-full rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 ${
              outOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'text-white hover:opacity-90 active:scale-[.98]'
            }`}
            style={!outOfStock ? { ...JAKARTA, background: 'var(--shop-primary,#006948)' } : JAKARTA}
          >
            {!outOfStock && <ShoppingCartIcon className="h-4 w-4 shrink-0" />}
            {buttonLabel()}
          </button>
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
