import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

interface Props {
  product: Product
  onClick: (product: Product) => void
}

export function ProductCard({ product, onClick }: Props) {
  const outOfStock = !product.has_variants && product.stock_quantity <= 0

  return (
    <button
      type="button"
      onClick={() => onClick(product)}
      disabled={outOfStock}
      className={[
        'flex flex-col items-start rounded-xl border p-3 text-left transition-all',
        'active:scale-95',
        outOfStock
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
          : 'border-gray-200 bg-white cursor-pointer hover:border-indigo-400 hover:shadow-sm',
      ].join(' ')}
    >
      {product.category && (
        <span className="mb-1.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
          {product.category.name}
        </span>
      )}

      <p className="line-clamp-2 text-sm font-semibold text-gray-800 leading-tight">
        {product.name}
      </p>

      {product.has_variants ? (
        <p className="mt-auto pt-2 text-xs text-indigo-500 font-medium">Choisir variante →</p>
      ) : (
        <>
          <p className="mt-1 text-base font-bold text-indigo-700">
            {formatCurrency(Number(product.price))}
          </p>
          <p
            className={`text-[11px] ${outOfStock ? 'text-red-500 font-medium' : 'text-gray-400'}`}
          >
            {outOfStock
              ? 'Rupture de stock'
              : `Stock : ${product.stock_quantity}${product.unit ? ` ${product.unit}` : ''}`}
          </p>
        </>
      )}
    </button>
  )
}
