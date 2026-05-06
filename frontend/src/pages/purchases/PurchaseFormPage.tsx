import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getProducts } from '@/services/api/products'
import { getSuppliers } from '@/services/api/suppliers'
import { getPurchaseOrder, createPurchaseOrder, updatePurchaseOrder } from '@/services/api/purchases'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Textarea, Select } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

// ── Schema (champs d'en-tête) ─────────────────────────────────────────────

const schema = z.object({
  supplier_id: z.number().nullable().optional(),
  expected_at: z.string().optional(),
  notes:       z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ── Type ligne ────────────────────────────────────────────────────────────

type PickedProduct = Pick<Product, 'id' | 'name'>

type LineItem = {
  uid: string
  product: PickedProduct | null
  product_id: number | null
  variant_id: number | null
  quantity_ordered: number
  unit_cost: number
}

function emptyLine(): LineItem {
  return {
    uid: crypto.randomUUID(),
    product: null,
    product_id: null,
    variant_id: null,
    quantity_ordered: 1,
    unit_cost: 0,
  }
}

// ── Composant recherche produit ────────────────────────────────────────────

function ProductPicker({
  value,
  onSelect,
}: {
  value: PickedProduct | null
  onSelect: (p: Product) => void
}) {
  const [text, setText] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const [deb, setDeb]   = useState('')
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setText(value?.name ?? '') }, [value])

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => setDeb(text), 300)
  }, [text])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data } = useQuery({
    queryKey: ['products-picker', deb],
    queryFn: () => getProducts({ search: deb || undefined }),
    enabled: open && deb.length >= 1,
    placeholderData: (prev) => prev,
  })

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher un produit…"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
      />
      {open && deb.length >= 1 && (data?.data.length ?? 0) > 0 && (
        <ul className="absolute top-full left-0 z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {data!.data.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => { onSelect(p); setText(p.name); setOpen(false) }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{p.name}</span>
                {p.sku && <span className="ml-2 text-xs text-gray-400">{p.sku}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function PurchaseFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [items, setItems] = useState<LineItem[]>([emptyLine()])

  // Fournisseurs
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', { all: true }],
    queryFn: () => getSuppliers({ is_active: true }),
  })

  // Données édition
  const { data: orderData, isLoading: orderLoading } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => getPurchaseOrder(Number(id)),
    enabled: isEdit,
  })

  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (orderData) {
      reset({
        supplier_id: orderData.supplier?.id ?? undefined,
        expected_at: orderData.expected_at ?? '',
        notes: orderData.notes ?? '',
      })
      if (orderData.items?.length) {
        setItems(
          orderData.items.map((item) => ({
            uid: crypto.randomUUID(),
            product: item.product
              ? { id: item.product_id, name: item.product.name }
              : null,
            product_id: item.product_id,
            variant_id: item.product_variant_id,
            quantity_ordered: parseFloat(item.quantity_ordered),
            unit_cost: parseFloat(item.unit_cost),
          }))
        )
      }
    }
  }, [orderData, reset])

  const total = items.reduce((sum, i) => sum + i.quantity_ordered * i.unit_cost, 0)

  // Mutations
  const buildPayload = (v: FormValues) => {
    const validItems = items.filter((i) => i.product_id !== null)
    if (validItems.length === 0) throw new Error('Ajoutez au moins un article.')
    return {
      supplier_id: v.supplier_id ?? null,
      expected_at: v.expected_at || null,
      notes: v.notes || null,
      items: validItems.map((i) => ({
        product_id: i.product_id!,
        product_variant_id: i.variant_id,
        quantity_ordered: i.quantity_ordered,
        unit_cost: i.unit_cost,
      })),
    }
  }

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => createPurchaseOrder(buildPayload(v)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); toast.success('Bon de commande créé.'); navigate('/purchases') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => updatePurchaseOrder(Number(id), buildPayload(v)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['purchase', id] })
      toast.success('Bon de commande mis à jour.')
      navigate('/purchases')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.error || updateMutation.error

  const onSubmit = (v: FormValues) => {
    if (isEdit) updateMutation.mutate(v)
    else createMutation.mutate(v)
  }

  const updateItem = useCallback((uid: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((i) => i.uid === uid ? { ...i, ...patch } : i))
  }, [])

  const removeItem = useCallback((uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid))
  }, [])

  if (isEdit && orderLoading) {
    return <div className="p-6 text-sm text-gray-400">Chargement du bon de commande…</div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-900">
        {isEdit ? 'Modifier le bon de commande' : 'Nouveau bon de commande'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Informations */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Informations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Fournisseur</label>
              <Select {...register('supplier_id', { setValueAs: (v) => v === '' ? null : Number(v) })}>
                <option value="">Aucun fournisseur</option>
                {suppliersData?.data.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <Input label="Livraison prévue" type="date" {...register('expected_at')} />
            <Textarea label="Notes" {...register('notes')} />
          </div>
        </div>

        {/* Articles */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Articles</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Produit</th>
                  <th className="pb-2 pr-3 w-24 font-medium">Quantité</th>
                  <th className="pb-2 pr-3 w-32 font-medium">Prix d'achat (FCFA)</th>
                  <th className="pb-2 w-28 text-right font-medium">Sous-total</th>
                  <th className="pb-2 w-10" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.uid}>
                    <td className="py-2 pr-3">
                      <ProductPicker
                        value={item.product}
                        onSelect={(p) => updateItem(item.uid, {
                          product: { id: p.id, name: p.name },
                          product_id: p.id,
                          unit_cost: parseFloat(String(p.cost_price ?? '0')) || 0,
                          variant_id: null,
                        })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity_ordered}
                        onChange={(e) => updateItem(item.uid, { quantity_ordered: parseFloat(e.target.value) || 0 })}
                        aria-label="Quantité commandée"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(item.uid, { unit_cost: parseFloat(e.target.value) || 0 })}
                        aria-label="Prix d'achat unitaire (FCFA)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {formatCurrency(item.quantity_ordered * item.unit_cost)}
                    </td>
                    <td className="py-2 pl-2">
                      <button
                        type="button"
                        onClick={() => removeItem(item.uid)}
                        disabled={items.length === 1}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        aria-label="Supprimer la ligne"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-4 text-right text-sm font-semibold text-gray-700">Total estimé</td>
                  <td className="pt-4 text-right text-base font-bold text-gray-900">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, emptyLine()])}
            className="mt-4 flex items-center gap-1.5 text-sm text-brand-primary hover:underline"
          >
            <PlusIcon className="h-4 w-4" />
            Ajouter un article
          </button>
        </div>

        {mutationError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {mutationError instanceof Error ? mutationError.message : 'Une erreur est survenue. Veuillez réessayer.'}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/purchases')}>Annuler</Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? 'Enregistrer' : 'Créer le bon'}
          </Button>
        </div>
      </form>
    </div>
  )
}
