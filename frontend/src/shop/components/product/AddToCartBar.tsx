import { ShoppingBagIcon } from '@heroicons/react/24/solid'
import { useShopStore } from '@/shop/store/shopStore'
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

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12.031 2C6.495 2 2 6.494 2 12.031c0 1.808.48 3.522 1.317 5.013L2.08 22l5.12-1.341a9.98 9.98 0 0 0 4.831 1.237h.004c5.534 0 10.029-4.494 10.029-10.031C22.064 6.494 17.568 2 12.031 2zm5.836 14.198c-.244.686-1.42 1.309-1.954 1.354-.51.043-1.12.062-3.238-.816-2.546-1.055-4.184-3.66-4.31-3.83-.127-.17-1.026-1.365-1.026-2.603 0-1.238.647-1.848.878-2.095.231-.247.505-.308.673-.308.169 0 .337.002.485.01.157.009.367-.06.574.437.214.516.73 1.777.794 1.905.064.128.106.278.02.449-.085.17-.128.277-.256.425-.127.15-.268.334-.383.449-.127.127-.26.265-.112.519.148.254.658 1.085 1.411 1.756.97.864 1.787 1.132 2.04 1.259.254.127.403.106.551-.064.15-.17.636-.74.805-.995.17-.254.34-.212.574-.127.233.085 1.48.698 1.734.825.254.127.424.19.488.297.063.107.063.619-.181 1.305z"/>
    </svg>
  )
}

export default function AddToCartBar({
  product,
  selectedVariantId,
  quantity,
  onQuantityChange,
  onAddToCart,
}: Props) {
  const currency        = useShopStore((s) => s.shopConfig?.currency ?? 'FCFA')
  const whatsappNumber  = useShopStore((s) =>
    s.shopConfig?.whatsapp_number?.replace(/[^0-9]/g, '') ?? null
  )
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId)
  const price           = selectedVariant?.price ?? product.price

  const stockQty   = selectedVariant
    ? selectedVariant.stock_quantity
    : product.has_variants ? null : (product.stock_quantity ?? 0)
  const isOutOfStock = stockQty !== null && stockQty <= 0
  const needsVariant = product.has_variants && !selectedVariantId
  const isDisabled   = isOutOfStock || needsVariant

  const buttonLabel = needsVariant
    ? 'Sélectionnez une option'
    : isOutOfStock
    ? 'Rupture de stock'
    : 'Ajouter au panier'

  const waText = encodeURIComponent(
    `Bonjour, je suis intéressé(e) par : ${product.name}${selectedVariant ? ` (${selectedVariant.attribute_summary})` : ''}`
  )
  const waHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${waText}` : null

  return (
    <div
      className="fixed bottom-14 left-0 right-0 z-30 px-3 py-2.5 flex items-center gap-2"
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid #f1f5f9', boxShadow: '0 -4px 20px -2px rgba(0,0,0,0.08)' }}
    >
      {/* Sélecteur quantité */}
      <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner shrink-0">
        <button
          type="button"
          onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
          aria-label="Diminuer"
          className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-700 font-bold active:scale-90 transition-transform shadow-sm text-lg"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-bold text-slate-900 tabular-nums">
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => onQuantityChange(Math.min(99, quantity + 1))}
          aria-label="Augmenter"
          className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-700 font-bold active:scale-90 transition-transform shadow-sm text-lg"
        >
          +
        </button>
      </div>

      {/* Bouton WhatsApp */}
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Commander via WhatsApp"
          className="h-12 w-12 shrink-0 flex items-center justify-center rounded-xl text-[#25D366] bg-emerald-50 hover:bg-emerald-100 active:scale-95 transition-transform"
        >
          <WhatsAppIcon />
        </a>
      )}

      {/* CTA principal */}
      <button
        type="button"
        onClick={onAddToCart}
        disabled={isDisabled}
        className="flex-1 h-12 rounded-xl text-white font-bold text-sm px-4 flex items-center justify-between transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: isDisabled ? '#94a3b8' : 'var(--shop-primary,#006948)', boxShadow: isDisabled ? 'none' : '0 6px 20px -4px rgba(0,105,72,0.45)' }}
      >
        <div className="flex items-center gap-2">
          <ShoppingBagIcon className="h-5 w-5 shrink-0" />
          <span>{buttonLabel}</span>
        </div>
        {!isDisabled && (
          <span
            className="px-2 py-1 rounded-lg text-xs font-black"
            style={{ background: 'rgba(0,0,0,0.15)' }}
          >
            {formatPrice(price * quantity)} {currency}
          </span>
        )}
      </button>
    </div>
  )
}
