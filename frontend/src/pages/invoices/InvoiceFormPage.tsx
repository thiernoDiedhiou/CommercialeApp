import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getProducts } from '@/services/api/products'
import { getCustomers } from '@/services/api/customers'
import { getInvoice, createInvoice, updateInvoice } from '@/services/api/invoices'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import Button from '@/components/ui/Button'
import Input, { Textarea, Select } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

// ── Schema ────────────────────────────────────────────────────────────────

const schema = z.object({
  customer_id:    z.number().nullable().optional(),
  issue_date:     z.string().min(1, 'Date d\'émission requise'),
  due_date:       z.string().optional(),
  discount_type:  z.enum(['percent', 'fixed']).nullable().optional(),
  discount_value: z.number().min(0).optional(),
  tax_rate:       z.number().min(0).max(100).optional(),
  notes:          z.string().optional(),
  footer:         z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ── Type ligne ────────────────────────────────────────────────────────────

type LineItem = {
  uid: string
  product_id: number | null
  description: string
  quantity: number
  unit_price: number
  discount: number
}

function emptyLine(): LineItem {
  return { uid: crypto.randomUUID(), product_id: null, description: '', quantity: 1, unit_price: 0, discount: 0 }
}

// ── Sélecteur produit ─────────────────────────────────────────────────────

function ProductPicker({ onSelect }: { onSelect: (p: Product) => void }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [deb, setDeb]   = useState('')
  const debRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

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
    queryKey: ['products-picker-inv', deb],
    queryFn:  () => getProducts({ search: deb || undefined }),
    enabled:  open && deb.length >= 1,
    placeholderData: (prev) => prev,
  })

  return (
    <div ref={wrapRef} className="relative">
      <input type="text" value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Ajouter depuis un produit (optionnel)…"
        aria-label="Rechercher un produit"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
      />
      {open && deb.length >= 1 && (data?.data.length ?? 0) > 0 && (
        <ul className="absolute top-full left-0 z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {data!.data.map((p) => (
            <li key={p.id}>
              <button type="button"
                onClick={() => { onSelect(p); setText(''); setOpen(false) }}
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

// ── Sélecteur client avec recherche ──────────────────────────────────────

function CustomerPicker({ initialName = '', onChange }: { initialName?: string; onChange: (id: number | null) => void }) {
  const [text, setText]   = useState(initialName)
  const [open, setOpen]   = useState(false)
  const [deb, setDeb]     = useState('')
  const debRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setText(initialName) }, [initialName])

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
    queryKey: ['customers-picker', deb],
    queryFn:  () => getCustomers({ search: deb || undefined, is_active: true }),
    placeholderData: (prev) => prev,
  })

  const customers = data?.data ?? []

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={text}
        onChange={(e) => { const v = e.target.value; setText(v); setOpen(true); if (v === '') onChange(null) }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher un client…"
        aria-label="Rechercher un client"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
      />
      {open && (
        <ul className="absolute top-full left-0 z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          <li>
            <button type="button"
              onClick={() => { onChange(null); setText(''); setOpen(false) }}
              className="w-full px-3 py-2 text-left text-sm italic text-gray-400 hover:bg-gray-50"
            >
              Aucun client
            </button>
          </li>
          {customers.map((c) => (
            <li key={c.id}>
              <button type="button"
                onClick={() => { onChange(c.id); setText(c.name); setOpen(false) }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{c.name}</span>
                {c.phone && <span className="ml-2 text-xs text-gray-400">{c.phone}</span>}
              </button>
            </li>
          ))}
          {customers.length === 0 && deb.length > 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">Aucun résultat</li>
          )}
        </ul>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [items, setItems] = useState<LineItem[]>([emptyLine()])

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(Number(id)),
    enabled: isEdit,
  })

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { issue_date: new Date().toISOString().split('T')[0], tax_rate: 0 },
  })

  const discountType = watch('discount_type')

  useEffect(() => {
    if (invoiceData) {
      reset({
        customer_id:    invoiceData.customer?.id ?? undefined,
        issue_date:     invoiceData.issue_date,
        due_date:       invoiceData.due_date ?? '',
        discount_type:  invoiceData.discount_type,
        discount_value: parseFloat(invoiceData.discount_value),
        tax_rate:       parseFloat(invoiceData.tax_rate),
        notes:          invoiceData.notes ?? '',
        footer:         invoiceData.footer ?? '',
      })
      if (invoiceData.items?.length) {
        setItems(invoiceData.items.map((item) => ({
          uid:         crypto.randomUUID(),
          product_id:  item.product_id,
          description: item.description,
          quantity:    parseFloat(item.quantity),
          unit_price:  parseFloat(item.unit_price),
          discount:    parseFloat(item.discount),
        })))
      }
    }
  }, [invoiceData, reset])

  // Calculs — arrondis à l'entier pour coller au comportement bcmath du backend
  const subtotal      = Math.round(items.reduce((s, i) => s + i.quantity * i.unit_price - i.discount, 0))
  const discountValue = parseFloat(String(watch('discount_value') ?? 0)) || 0
  const discountAmt   = Math.round(discountType === 'percent'
    ? subtotal * discountValue / 100
    : discountType === 'fixed' ? discountValue : 0)
  const taxRate    = parseFloat(String(watch('tax_rate') ?? 0)) || 0
  const taxAmount  = Math.round((subtotal - discountAmt) * taxRate / 100)
  const total      = subtotal - discountAmt + taxAmount

  const buildPayload = (v: FormValues) => {
    const validItems = items.filter((i) => i.description.trim())
    if (validItems.length === 0) throw new Error('Ajoutez au moins une ligne.')
    return {
      customer_id:    v.customer_id ?? null,
      issue_date:     v.issue_date,
      due_date:       v.due_date || null,
      discount_type:  v.discount_type ?? null,
      discount_value: v.discount_value ?? 0,
      tax_rate:       v.tax_rate ?? 0,
      notes:          v.notes || null,
      footer:         v.footer || null,
      items: validItems.map((i) => ({
        product_id:  i.product_id,
        description: i.description,
        quantity:    i.quantity,
        unit_price:  i.unit_price,
        discount:    i.discount,
      })),
    }
  }

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => createInvoice(buildPayload(v)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Facture créée.'); navigate('/invoices') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => updateInvoice(Number(id), buildPayload(v)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      toast.success('Facture mise à jour.')
      navigate(`/invoices/${id}`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.error || updateMutation.error

  const onSubmit = (v: FormValues) => isEdit ? updateMutation.mutate(v) : createMutation.mutate(v)

  const updateItem = useCallback((uid: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((i) => i.uid === uid ? { ...i, ...patch } : i))
  }, [])
  const removeItem = useCallback((uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid))
  }, [])

  if (isEdit && isLoading) return <div className="p-6 text-sm text-gray-400">Chargement…</div>

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-900">
        {isEdit ? 'Modifier la facture' : 'Nouvelle facture'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Informations générales */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Informations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Client</label>
              <CustomerPicker
                initialName={invoiceData?.customer?.name ?? ''}
                onChange={(id) => setValue('customer_id', id)}
              />
            </div>
            <Input label="Date d'émission *" type="date" error={errors.issue_date?.message} {...register('issue_date')} />
            <Input label="Date d'échéance" type="date" {...register('due_date')} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Remise</label>
              <Select {...register('discount_type', { setValueAs: (v) => v === '' ? null : v })}>
                <option value="">Aucune</option>
                <option value="percent">En pourcentage (%)</option>
                <option value="fixed">Montant fixe (FCFA)</option>
              </Select>
            </div>
            {discountType && (
              <Input
                label={discountType === 'percent' ? 'Taux (%)' : 'Montant (FCFA)'}
                type="number" min={0}
                {...register('discount_value', { valueAsNumber: true })}
              />
            )}
            <Input label="TVA (%)" type="number" min={0} max={100} placeholder="0"
              {...register('tax_rate', { valueAsNumber: true })} />
          </div>
        </div>

        {/* Lignes */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Lignes de facturation</h2>

          {/* Sélecteur rapide produit */}
          <div className="mb-4">
            <ProductPicker onSelect={(p) => setItems((prev) => [...prev, {
              uid: crypto.randomUUID(),
              product_id: p.id,
              description: p.name,
              quantity: 1,
              unit_price: parseFloat(String(p.price)) || 0,
              discount: 0,
            }])} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Description</th>
                  <th className="pb-2 pr-3 w-20 font-medium">Qté</th>
                  <th className="pb-2 pr-3 w-28 font-medium">Prix unit.</th>
                  <th className="pb-2 pr-3 w-24 font-medium">Remise</th>
                  <th className="pb-2 w-24 text-right font-medium">Total</th>
                  <th className="pb-2 w-10"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => {
                  const lineTotal = item.quantity * item.unit_price - item.discount
                  return (
                    <tr key={item.uid}>
                      <td className="py-2 pr-3">
                        <input type="text" value={item.description}
                          onChange={(e) => updateItem(item.uid, { description: e.target.value })}
                          placeholder="Désignation de la prestation…"
                          aria-label="Description de la ligne"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0.001" step="0.001" value={item.quantity}
                          onChange={(e) => updateItem(item.uid, { quantity: parseFloat(e.target.value) || 0 })}
                          aria-label="Quantité"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0" step="1" value={item.unit_price}
                          onChange={(e) => updateItem(item.uid, { unit_price: parseFloat(e.target.value) || 0 })}
                          aria-label="Prix unitaire"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0" step="1" value={item.discount}
                          onChange={(e) => updateItem(item.uid, { discount: parseFloat(e.target.value) || 0 })}
                          aria-label="Remise sur la ligne"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900">
                        {formatCurrency(Math.max(0, lineTotal))}
                      </td>
                      <td className="py-2 pl-2">
                        <button type="button" onClick={() => removeItem(item.uid)}
                          disabled={items.length === 1}
                          aria-label="Supprimer la ligne"
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr><td colSpan={4} className="pt-3 text-right text-xs text-gray-500">Sous-total</td><td className="pt-3 text-right text-sm text-gray-700">{formatCurrency(subtotal)}</td><td /></tr>
                {discountAmt > 0 && <tr><td colSpan={4} className="text-right text-xs text-red-500">Remise</td><td className="text-right text-sm text-red-500">−{formatCurrency(discountAmt)}</td><td /></tr>}
                {taxAmount > 0 && <tr><td colSpan={4} className="text-right text-xs text-gray-500">TVA ({taxRate}%)</td><td className="text-right text-sm text-gray-700">{formatCurrency(taxAmount)}</td><td /></tr>}
                <tr><td colSpan={4} className="pt-2 text-right text-sm font-bold text-gray-900">TOTAL</td><td className="pt-2 text-right text-base font-bold text-gray-900">{formatCurrency(total)}</td><td /></tr>
              </tfoot>
            </table>
          </div>

          <button type="button" onClick={() => setItems((prev) => [...prev, emptyLine()])}
            className="mt-4 flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
            <PlusIcon className="h-4 w-4" />
            Ajouter une ligne
          </button>
        </div>

        {/* Notes & Footer */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Notes & mentions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Textarea label="Notes internes" placeholder="Visible uniquement en interne…" {...register('notes')} />
            <Textarea label="Mentions légales / conditions" placeholder="Ex : Paiement à 30 jours…" {...register('footer')} />
          </div>
        </div>

        {mutationError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {mutationError instanceof Error ? mutationError.message : 'Une erreur est survenue.'}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(isEdit ? `/invoices/${id}` : '/invoices')}>
            Annuler
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? 'Enregistrer' : 'Créer la facture'}
          </Button>
        </div>
      </form>
    </div>
  )
}
