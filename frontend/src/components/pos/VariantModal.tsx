import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { Product, ProductVariant } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  product: Product | null
  onSelect: (product: Product, variant: ProductVariant) => void
  onClose: () => void
}

export function VariantModal({ product, onSelect, onClose }: Props) {
  if (!product) return null

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Variantes — ${product.name}`}
      footer={<Button variant="secondary" onClick={onClose}>Annuler</Button>}
    >
      <div className="space-y-2">
        {product.variants?.map((v) => {
          const outOfStock = v.stock_quantity <= 0
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => !outOfStock && (onSelect(product, v), onClose())}
              disabled={outOfStock}
              className={[
                'w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition',
                outOfStock
                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
                  : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer',
              ].join(' ')}
            >
              <div>
                <p className="font-medium text-gray-900">{v.attribute_summary}</p>
                {v.sku && <p className="text-xs text-gray-400">SKU : {v.sku}</p>}
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="font-bold text-indigo-700">{formatCurrency(Number(v.price))}</p>
                <p
                  className={`text-xs ${outOfStock ? 'text-red-500 font-medium' : 'text-gray-400'}`}
                >
                  {outOfStock ? 'Rupture' : `Stock : ${v.stock_quantity}`}
                </p>
              </div>
            </button>
          )
        })}
        {!product.variants?.length && (
          <p className="text-center text-sm text-gray-400 py-4">Aucune variante disponible</p>
        )}
      </div>
    </Modal>
  )
}
