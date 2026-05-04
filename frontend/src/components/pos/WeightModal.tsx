import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { BackspaceIcon } from '@heroicons/react/24/outline'
import type { Product } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  product: Product | null
  onConfirm: (product: Product, weight: number) => void
  onClose: () => void
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'] as const

export function WeightModal({ product, onConfirm, onClose }: Props) {
  const [value, setValue] = useState('0')

  if (!product) return null

  const handleKey = (k: string) => {
    if (k === '⌫') {
      setValue((v) => (v.length > 1 ? v.slice(0, -1) : '0'))
      return
    }
    if (k === '.' && value.includes('.')) return
    setValue((v) => (v === '0' && k !== '.' ? k : v + k))
  }

  const weight = parseFloat(value) || 0
  const total = weight * Number(product.price)
  const unit = product.unit ?? 'kg'

  const handleConfirm = () => {
    if (weight <= 0) return
    onConfirm(product, weight)
    setValue('0')
    onClose()
  }

  const handleClose = () => {
    setValue('0')
    onClose()
  }

  return (
    <Modal
      isOpen
      onClose={handleClose}
      title={`Pesée — ${product.name}`}
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" className="flex-1" onClick={handleClose}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={weight <= 0}>
            Ajouter {weight > 0 && `— ${formatCurrency(total)}`}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-full rounded-xl bg-gray-50 border border-gray-200 px-6 py-4 text-right">
          <span className="text-4xl font-bold text-gray-900 tabular-nums">{value}</span>
          <span className="ml-2 text-xl text-gray-400">{unit}</span>
        </div>

        {weight > 0 && (
          <p className="text-sm text-gray-500">
            {value} {unit} × {formatCurrency(Number(product.price))} ={' '}
            <strong>{formatCurrency(total)}</strong>
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 w-full">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => handleKey(k)}
              className={[
                'h-14 rounded-xl border text-lg font-semibold transition active:scale-95',
                k === '⌫'
                  ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
                  : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
              ].join(' ')}
            >
              {k === '⌫' ? <BackspaceIcon className="h-5 w-5 mx-auto" /> : k}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
