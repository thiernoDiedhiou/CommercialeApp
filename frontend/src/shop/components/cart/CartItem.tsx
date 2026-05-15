import { TrashIcon } from '@heroicons/react/24/outline'
import type { ShopCartItem } from '@/shop/store/shopStore'
import { useShopStore } from '@/shop/store/shopStore'

interface Props {
  item  : ShopCartItem
  index : number
}

function formatPrice(price: number): string {
  return Math.round(price).toLocaleString('fr-FR')
}

export default function CartItem({ item, index }: Props) {
  const removeItem     = useShopStore((s) => s.removeItem)
  const updateQuantity = useShopStore((s) => s.updateQuantity)

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">

      {/* ── Image ──────────────────────────────────────────────────────────── */}
      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.product_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="text-lg font-bold text-gray-300 select-none">
              {item.product_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* ── Infos ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-snug truncate">
          {item.product_name}
        </p>

        {item.variant_name && (
          <p className="text-xs text-gray-400 mt-0.5">
            {item.is_weight_based
              ? `${item.quantity}${item.unit ?? ''}`
              : item.variant_name}
          </p>
        )}

        {/* Quantité — TYPE 0/1/3 uniquement */}
        {!item.is_weight_based && (
          <div className="flex items-center gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => updateQuantity(index, item.quantity - 1)}
              aria-label="Diminuer"
              className="h-8 w-8 rounded-lg bg-gray-100 text-gray-700 text-base font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold text-gray-900">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(index, Math.min(99, item.quantity + 1))}
              aria-label="Augmenter"
              className="h-8 w-8 rounded-lg bg-gray-100 text-gray-700 text-base font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* ── Prix + Supprimer ───────────────────────────────────────────────── */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--shop-primary, #111827)' }}
        >
          {formatPrice(item.total)} FCFA
        </span>

        <button
          type="button"
          onClick={() => removeItem(index)}
          aria-label="Supprimer l'article"
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
