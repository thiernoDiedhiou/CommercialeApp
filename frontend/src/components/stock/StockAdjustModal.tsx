import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { getProducts } from '@/services/api/products'
import { adjustStock } from '@/services/api/stock'
import type { Product, ProductVariant } from '@/types'

const schema = z.object({
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number({ invalid_type_error: 'Quantité requise' }),
  unit_cost: z.number().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
})

type FormValues = z.infer<typeof schema>

export interface StockAdjustPrefill {
  product_id: number
  product_name: string
  variant_id: number | null
  variant_summary: string | null
}

interface Props {
  isOpen: boolean
  prefill?: StockAdjustPrefill | null
  onClose: () => void
  onSuccess: () => void
}

const TYPE_OPTIONS = [
  { value: 'in' as const, label: 'Entrée', hint: 'Livraison, achat' },
  { value: 'out' as const, label: 'Sortie', hint: 'Perte, casse' },
  { value: 'adjustment' as const, label: 'Inventaire', hint: 'Correction (± qté)' },
]

export function StockAdjustModal({ isOpen, prefill, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const dropRef = useRef<HTMLDivElement>(null)

  const [productSearch, setProductSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'in', quantity: undefined, unit_cost: null, note: '' },
  })
  const typeValue = watch('type')

  // Debounce product search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(productSearch), 300)
    return () => clearTimeout(t)
  }, [productSearch])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Apply prefill / reset on open-close
  useEffect(() => {
    if (isOpen) {
      reset({ type: 'in', quantity: undefined, unit_cost: null, note: '' })
      setApiError(null)
      if (prefill) {
        setSelectedProduct({ id: prefill.product_id, name: prefill.product_name } as Product)
        setSelectedVariant(
          prefill.variant_id
            ? ({ id: prefill.variant_id, attribute_summary: prefill.variant_summary ?? '' } as ProductVariant)
            : null,
        )
        setProductSearch('')
      } else {
        setSelectedProduct(null)
        setSelectedVariant(null)
        setProductSearch('')
      }
    }
  }, [isOpen, prefill, reset])

  const { data: productPage } = useQuery({
    queryKey: ['products-search-adjust', debouncedSearch],
    queryFn: () => getProducts({ search: debouncedSearch, is_active: true }),
    enabled: debouncedSearch.length >= 1 && !selectedProduct,
  })
  const productResults = productPage?.data ?? []

  const mutation = useMutation({
    mutationFn: adjustStock,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['pos-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      onSuccess()
      onClose()
    },
  })

  const onSubmit = async (values: FormValues) => {
    if (!selectedProduct) { setApiError('Veuillez sélectionner un produit.'); return }
    setApiError(null)
    try {
      await mutation.mutateAsync({
        product_id: selectedProduct.id,
        variant_id: selectedVariant?.id ?? null,
        type: values.type,
        quantity: values.quantity,
        unit_cost: values.unit_cost ?? null,
        note: values.note || null,
      })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setApiError(msg ?? "Erreur lors de l'ajustement.")
    }
  }

  const clearProduct = () => {
    setSelectedProduct(null)
    setSelectedVariant(null)
    setProductSearch('')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustement de stock"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="stock-adjust-form"
            className="flex-1"
            loading={mutation.isPending}
          >
            Confirmer
          </Button>
        </div>
      }
    >
      <form id="stock-adjust-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Product selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Produit *</label>
          {selectedProduct ? (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedProduct.name}</p>
                {selectedVariant && (
                  <p className="text-xs text-gray-400">{selectedVariant.attribute_summary}</p>
                )}
              </div>
              <button
                type="button"
                onClick={clearProduct}
                className="text-xs text-indigo-500 hover:text-indigo-700 transition"
              >
                Changer
              </button>
            </div>
          ) : (
            <div className="relative" ref={dropRef}>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setShowDrop(true) }}
                onFocus={() => setShowDrop(true)}
                placeholder="Rechercher un produit…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition"
              />
              {showDrop && productResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {productResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(p)
                        setSelectedVariant(null)
                        setProductSearch('')
                        setShowDrop(false)
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">
                        {p.has_variants
                          ? 'Avec variantes'
                          : `Stock actuel : ${p.stock_quantity}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Variant selector (only if product has variants and none selected yet) */}
        {selectedProduct?.has_variants && !selectedVariant && !prefill && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Variante *</label>
            {selectedProduct.variants?.length ? (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {selectedProduct.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left hover:border-indigo-400 hover:bg-indigo-50 transition"
                  >
                    <span className="text-sm text-gray-800">{v.attribute_summary}</span>
                    <span className="text-xs text-gray-400">Stock : {v.stock_quantity}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Aucune variante disponible</p>
            )}
          </div>
        )}

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const checked = typeValue === opt.value
              return (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-lg border p-2.5 text-center transition ${
                    checked ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input type="radio" value={opt.value} {...register('type')} className="sr-only" />
                  <p className={`text-sm font-semibold ${checked ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{opt.hint}</p>
                </label>
              )
            })}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantité *{typeValue === 'adjustment' && (
              <span className="ml-1 font-normal text-gray-400">(négatif = réduction)</span>
            )}
          </label>
          <input
            type="number"
            step="any"
            {...register('quantity', { valueAsNumber: true })}
            placeholder={typeValue === 'adjustment' ? 'ex : +10 ou -5' : '0'}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition"
          />
          {errors.quantity && (
            <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>
          )}
        </div>

        {/* Unit cost */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prix unitaire <span className="font-normal text-gray-400">(optionnel)</span>
          </label>
          <input
            type="number"
            min={0}
            step="any"
            {...register('unit_cost', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' || v === undefined ? null : Number(v)),
            })}
            placeholder="Prix d'achat en FCFA"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note <span className="font-normal text-gray-400">(optionnel)</span>
          </label>
          <textarea
            {...register('note')}
            rows={2}
            placeholder="Raison de l'ajustement…"
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition"
          />
        </div>

        {apiError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {apiError}
          </div>
        )}
      </form>
    </Modal>
  )
}
