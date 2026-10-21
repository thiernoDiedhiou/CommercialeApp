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
        'flex flex-col items-start rounded-xl border text-left transition-all overflow-hidden',
        'active:scale-95',
        outOfStock
          ? 'cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 opacity-50'
          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer hover:border-brand-primary hover:shadow-sm',
      ].join(' ')}
    >
      {/* Image / placeholder */}
      <div className="w-full aspect-[4/3] bg-gray-50 dark:bg-gray-700 shrink-0 overflow-hidden flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-4xl font-bold text-gray-200 dark:text-gray-600 select-none">
            {product.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex flex-col items-start w-full p-2.5 gap-0.5">
        {product.category && (
          <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-medium text-brand-primary">
            {product.category.name}
          </span>
        )}

        <p className="line-clamp-2 text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">
          {product.name}
        </p>

        {product.has_variants ? (
          <p className="mt-1 text-xs text-brand-primary font-medium">Choisir variante →</p>
        ) : (
          <>
            <p className="text-base font-bold text-brand-primary">
              {formatCurrency(Number(product.price))}
            </p>
            <p className={`text-[11px] ${outOfStock ? 'text-red-500 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
              {outOfStock
                ? 'Rupture de stock'
                : `Stock : ${product.stock_quantity}${product.unit ? ` ${product.unit}` : ''}`}
            </p>
          </>
        )}
      </div>
    </button>
  )
}
