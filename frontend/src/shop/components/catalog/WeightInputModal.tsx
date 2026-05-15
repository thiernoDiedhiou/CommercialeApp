import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { ShopProduct } from '@/shop/services/shop'
import { useShopStore } from '@/shop/store/shopStore'

interface Props {
  product : ShopProduct
  isOpen  : boolean
  onClose : () => void
}

interface UnitConfig {
  step: number
  min : number
}

function getUnitConfig(unit: string | null): UnitConfig {
  switch (unit) {
    case 'kg': return { step: 0.1, min: 0.1 }
    case 'g' : return { step: 50,  min: 50  }
    case 'L' : return { step: 0.1, min: 0.1 }
    case 'ml': return { step: 50,  min: 50  }
    default  : return { step: 1,   min: 1   }
  }
}

function formatPrice(price: number): string {
  return Math.round(price).toLocaleString('fr-FR')
}

export default function WeightInputModal({ product, isOpen, onClose }: Props) {
  const addItem  = useShopStore((s) => s.addItem)
  const openCart = useShopStore((s) => s.openCart)

  const { step, min } = getUnitConfig(product.unit)
  const [weight, setWeight] = useState(min)

  // Réinitialise le poids à l'ouverture
  useEffect(() => {
    if (isOpen) setWeight(min)
  }, [isOpen, min])

  if (!isOpen) return null

  const total       = Math.round(weight * product.price)
  const canConfirm  = weight > 0
  const unitLabel   = product.unit ?? 'unité'

  const decrement = () => setWeight((w) => Math.max(min, parseFloat((w - step).toFixed(3))))
  const increment = () => setWeight((w) => parseFloat((w + step).toFixed(3)))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (!isNaN(val) && val > 0) setWeight(val)
  }

  const handleConfirm = () => {
    addItem({
      product_id     : product.id,
      variant_id     : null,
      product_name   : product.name,
      variant_name   : `${weight}${unitLabel}`,
      image_url      : product.image_url,
      quantity       : weight,
      unit_price     : product.price,
      total          : total,
      is_weight_based: true,
      unit           : product.unit,
    })
    openCart()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 text-base leading-tight">
              {product.name}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatPrice(product.price)} FCFA / {unitLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 -mt-1 -mr-1"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* ── Input zone ──────────────────────────────────────────────────── */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={decrement}
            aria-label="Diminuer"
            className="h-14 w-14 rounded-full bg-gray-100 text-gray-700 text-2xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            −
          </button>

          <div className="flex items-baseline gap-1">
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              min={min}
              step={step}
              onChange={handleInputChange}
              className="text-4xl font-bold text-center w-24 border-none outline-none bg-transparent text-gray-900"
            />
            <span className="text-xl text-gray-400">{unitLabel}</span>
          </div>

          <button
            type="button"
            onClick={increment}
            aria-label="Augmenter"
            className="h-14 w-14 rounded-full bg-gray-100 text-gray-700 text-2xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            +
          </button>
        </div>

        {/* ── Prix calculé ────────────────────────────────────────────────── */}
        <p className="mt-4 text-center text-xl font-bold" style={{ color: 'var(--shop-primary, #111827)' }}>
          Total : {formatPrice(total)} FCFA
        </p>

        {/* ── Bouton confirmer ─────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="mt-6 w-full h-14 rounded-xl text-white font-semibold text-base transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          style={{ backgroundColor: 'var(--shop-primary, #111827)' }}
        >
          Ajouter — {formatPrice(total)} FCFA
        </button>
      </div>
    </div>
  )
}
