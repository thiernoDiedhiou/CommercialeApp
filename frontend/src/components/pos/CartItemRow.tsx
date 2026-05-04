import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { CartItem } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'

interface Props {
  item: CartItem
  index: number
  onRemove: (index: number) => void
  onUpdateQty: (index: number, qty: number) => void
  onUpdateDiscount: (index: number, discount: number) => void
}

export function CartItemRow({ item, index, onRemove, onUpdateQty, onUpdateDiscount }: Props) {
  const lineBase = item.unit_price * (item.unit_weight ?? item.quantity)
  const lineTotal = Math.max(0, lineBase - item.discount)
  const designation = [item.product.name, item.variant?.attribute_summary]
    .filter(Boolean)
    .join(' — ')

  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 leading-tight flex-1 min-w-0 truncate">
          {designation}
        </p>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        {item.unit_weight !== null ? (
          <span className="text-xs text-gray-500">
            {item.unit_weight} kg × {formatCurrency(item.unit_price)}
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpdateQty(index, item.quantity - 1)}
              className="h-6 w-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition"
            >
              <MinusIcon className="h-3 w-3" />
            </button>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => onUpdateQty(index, parseInt(e.target.value) || 1)}
              className="w-10 rounded border border-gray-200 text-center text-sm py-0.5"
            />
            <button
              type="button"
              onClick={() => onUpdateQty(index, item.quantity + 1)}
              className="h-6 w-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition"
            >
              <PlusIcon className="h-3 w-3" />
            </button>
            <span className="text-xs text-gray-400 ml-1">× {formatCurrency(item.unit_price)}</span>
          </div>
        )}
        <span className="ml-auto text-sm font-semibold text-gray-900">
          {formatCurrency(lineTotal)}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-1">
        <span className="text-[11px] text-gray-400">Remise</span>
        <input
          type="number"
          min={0}
          value={item.discount || ''}
          placeholder="0"
          onChange={(e) => onUpdateDiscount(index, parseInt(e.target.value) || 0)}
          className="w-20 rounded border border-gray-200 text-xs px-1.5 py-0.5 text-gray-600"
        />
        <span className="text-[11px] text-gray-400">FCFA</span>
      </div>
    </div>
  )
}
