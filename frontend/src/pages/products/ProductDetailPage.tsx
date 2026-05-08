import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PencilSquareIcon, ArrowLeftIcon, CubeIcon,
  ChartBarIcon, ArrowsUpDownIcon, TagIcon, PlusIcon,
} from '@heroicons/react/24/outline'
import type { StockAdjustPrefill } from '@/components/stock/StockAdjustModal'
import { getProduct, getProductStockMovements, createVariant } from '@/services/api/products'
import { getAttributes } from '@/services/api/attributes'
import { formatCurrency, formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import CanDo from '@/components/ui/CanDo'
import { StockAdjustModal } from '@/components/stock/StockAdjustModal'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import type { ProductVariant } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { variant: 'success' | 'danger' | 'warning' | 'default'; label: string }> = {
  in:         { variant: 'success', label: 'Entrée' },
  out:        { variant: 'danger',  label: 'Sortie' },
  adjustment: { variant: 'warning', label: 'Inventaire' },
  return:     { variant: 'default', label: 'Retour' },
}

function margin(price: string, cost: string): string {
  const p = parseFloat(price)
  const c = parseFloat(cost)
  if (!c || !p) return '—'
  return `${Math.round(((p - c) / p) * 100)} %`
}

function profit(price: string, cost: string): string {
  const p = parseFloat(price)
  const c = parseFloat(cost)
  if (!c) return '—'
  return formatCurrency(p - c)
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustPrefill, setAdjustPrefill] = useState<StockAdjustPrefill | null>(null)
  const [addVariantOpen, setAddVariantOpen] = useState(false)

  const openAdjust = (prefill: StockAdjustPrefill) => {
    setAdjustPrefill(prefill)
    setAdjustOpen(true)
  }

  const addVariantMutation = useMutation({
    mutationFn: (data: { attribute_value_ids: number[]; sku: string; price: string }) =>
      createVariant(Number(id), {
        attribute_value_ids: data.attribute_value_ids,
        sku: data.sku || null,
        price: data.price ? Number(data.price) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', id] })
      setAddVariantOpen(false)
      toast.success('Variante ajoutée.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const { data: product, isLoading, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(Number(id)),
  })

  const { data: movementsPage, isLoading: movLoading } = useQuery({
    queryKey: ['product-movements', id],
    queryFn: () => getProductStockMovements(Number(id), { page: 1 }),
    enabled: !!id,
  })

  const movements = movementsPage?.data ?? []

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!product) {
    return <div className="p-6 text-sm text-gray-400">Produit introuvable.</div>
  }

  const hasVariants = product.has_variants
  const variants = product.variants ?? []

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/products')}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Retour aux produits">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name}
              className="h-14 w-14 rounded-xl object-cover ring-1 ring-gray-200" />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-300">
              {product.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
              {!product.is_active && <Badge variant="danger">Inactif</Badge>}
              {hasVariants && <Badge variant="info">Variantes</Badge>}
              {product.is_weight_based && <Badge variant="default">Poids</Badge>}
              {product.has_expiry && <Badge variant="warning">Expiration</Badge>}
            </div>
            {product.sku && (
              <p className="text-xs font-mono text-gray-400 mt-0.5">SKU : {product.sku}</p>
            )}
            {product.category && (
              <p className="text-xs text-gray-500">{product.category.name}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {!hasVariants && (
            <CanDo permission="stock.adjust">
              <Button variant="outline"
                onClick={() => openAdjust({ product_id: product.id, product_name: product.name, variant_id: null, variant_summary: null })}
                icon={<ArrowsUpDownIcon className="h-4 w-4" />}>
                Ajuster stock
              </Button>
            </CanDo>
          )}
          <CanDo permission="products.edit">
            <Button icon={<PencilSquareIcon className="h-4 w-4" />}
              onClick={() => navigate(`/products/${id}/edit`)}>
              Modifier
            </Button>
          </CanDo>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Prix */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <TagIcon className="h-4 w-4 text-brand-primary" />
            <p className="text-sm font-semibold text-gray-700">Tarification</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Prix de vente</span>
              <span className="font-semibold text-gray-900">{formatCurrency(product.price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Prix d'achat</span>
              <span className="font-medium text-gray-700">
                {product.cost_price ? formatCurrency(product.cost_price) : <span className="text-gray-300">—</span>}
              </span>
            </div>
            {product.cost_price && (
              <>
                <div className="flex justify-between text-sm border-t border-gray-50 pt-2">
                  <span className="text-gray-500">Bénéfice unitaire</span>
                  <span className="font-medium text-emerald-600">{profit(product.price, product.cost_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Marge</span>
                  <span className="font-medium text-emerald-600">{margin(product.price, product.cost_price)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stock */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <CubeIcon className="h-4 w-4 text-brand-secondary" />
            <p className="text-sm font-semibold text-gray-700">Stock</p>
          </div>
          {hasVariants ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 italic">Le stock est géré par variante</p>
              {variants.map((v) => {
                const low = v.alert_threshold !== null && v.stock_quantity <= v.alert_threshold
                return (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{v.attribute_summary || '—'}</span>
                    <span className={`font-bold ${low ? 'text-red-600' : 'text-emerald-600'}`}>
                      {v.stock_quantity}
                    </span>
                  </div>
                )
              })}
              <div className="border-t border-gray-50 pt-2 flex justify-between text-sm font-medium">
                <span className="text-gray-500">Total</span>
                <span className="text-gray-900">{variants.reduce((s, v) => s + v.stock_quantity, 0)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">En stock</span>
                <span className={`text-xl font-bold ${
                  product.alert_threshold !== null && product.stock_quantity <= product.alert_threshold
                    ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {product.stock_quantity}
                  {product.unit && <span className="text-sm font-normal ml-1">{product.unit}</span>}
                </span>
              </div>
              {product.alert_threshold !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Seuil d'alerte</span>
                  <span className="font-medium text-amber-600">{product.alert_threshold}</span>
                </div>
              )}
              {product.alert_threshold !== null && product.stock_quantity <= product.alert_threshold && (
                <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-3 py-1.5 text-xs text-red-600 font-medium">
                  ⚠ Stock bas — réapprovisionner
                </div>
              )}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <ChartBarIcon className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">Informations</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Statut</span>
              <Badge variant={product.is_active ? 'success' : 'danger'} dot>
                {product.is_active ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
            {product.barcode && (
              <div className="flex justify-between">
                <span className="text-gray-500">Code-barres</span>
                <span className="font-mono text-xs text-gray-700">{product.barcode}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Vendu au poids</span>
              <span>{product.is_weight_based ? 'Oui' : 'Non'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Suivi expiration</span>
              <span>{product.has_expiry ? 'Oui' : 'Non'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{product.description}</p>
        </div>
      )}

      {/* Variantes */}
      {hasVariants && (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              Variantes
              <span className="ml-2 text-xs font-normal text-gray-400">({variants.length})</span>
            </p>
            <CanDo permission="variants.create">
              <Button size="sm" variant="outline"
                icon={<PlusIcon className="h-3.5 w-3.5" />}
                onClick={() => setAddVariantOpen(true)}>
                Ajouter une variante
              </Button>
            </CanDo>
          </div>
          {variants.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Aucune variante.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Combinaison</th>
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-right">Prix</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {variants.map((v) => {
                    const low = v.alert_threshold !== null && v.stock_quantity <= v.alert_threshold
                    return (
                      <tr key={v.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {v.attribute_summary || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {v.sku ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {v.price ? formatCurrency(v.price) : <span className="text-gray-300">Hérité</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${low ? 'text-red-600' : 'text-emerald-600'}`}>
                          {v.stock_quantity}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={v.is_active ? 'success' : 'default'} dot>
                            {v.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CanDo permission="stock.adjust">
                            <button type="button"
                              onClick={() => openAdjust({
                                product_id: product.id,
                                product_name: product.name,
                                variant_id: v.id,
                                variant_summary: v.attribute_summary,
                              })}
                              className="rounded px-2 py-1 text-xs text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/5 transition">
                              Ajuster
                            </button>
                          </CanDo>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mouvements de stock récents */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Mouvements de stock récents</p>
          <Link to="/stock" className="text-xs text-brand-primary hover:underline">
            Voir tout le stock
          </Link>
        </div>

        {movLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
          </div>
        ) : movements.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Aucun mouvement de stock.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Variante</th>
                  <th className="px-4 py-3 text-right">Qté</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">Après</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Note</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movements.slice(0, 10).map((m) => {
                  const badge = TYPE_BADGE[m.type] ?? { variant: 'default' as const, label: m.type }
                  const isOut = m.type === 'out'
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-500 text-xs">
                        {m.variant?.attribute_summary ?? '—'}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
                        {isOut ? '-' : '+'}{m.quantity}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell text-gray-500">
                        {m.stock_after}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs truncate max-w-[180px]">
                        {m.notes ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDate(m.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ajustement stock */}
      {addVariantOpen && (
        <AddVariantModal
          productId={Number(id)}
          existingVariants={variants}
          isPending={addVariantMutation.isPending}
          onClose={() => setAddVariantOpen(false)}
          onSubmit={(data: { attribute_value_ids: number[]; sku: string; price: string }) => addVariantMutation.mutate(data)}
        />
      )}

      {adjustOpen && (
        <StockAdjustModal
          isOpen={adjustOpen}
          onClose={() => { setAdjustOpen(false); setAdjustPrefill(null) }}
          onSuccess={() => refetch()}
          prefill={adjustPrefill}
        />
      )}
    </div>
  )
}

// ── Modal d'ajout de variante ─────────────────────────────────────────────

function AddVariantModal({
  productId: _productId,
  existingVariants,
  isPending,
  onClose,
  onSubmit,
}: {
  productId: number
  existingVariants: ProductVariant[]
  isPending: boolean
  onClose: () => void
  onSubmit: (data: { attribute_value_ids: number[]; sku: string; price: string }) => void
}) {
  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: getAttributes,
    staleTime: 5 * 60 * 1000,
  })

  const [selected, setSelected] = useState<Record<number, number>>({}) // attrId → valueId
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')

  const toggle = (attrId: number, valueId: number) =>
    setSelected((prev) => ({ ...prev, [attrId]: prev[attrId] === valueId ? 0 : valueId }))

  const selectedIds = Object.values(selected).filter(Boolean)
  const canSubmit = selectedIds.length > 0

  const label = attributes
    .filter((a) => selected[a.id])
    .map((a) => a.values.find((v) => v.id === selected[a.id])?.value ?? '')
    .filter(Boolean)
    .join(' / ')

  const alreadyExists = !!label && existingVariants.some(
    (v) => v.attribute_summary?.toLowerCase() === label.toLowerCase()
  )

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Ajouter une variante"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            loading={isPending}
            disabled={!canSubmit || alreadyExists}
            onClick={() => onSubmit({ attribute_value_ids: selectedIds, sku, price })}
          >
            Ajouter
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : attributes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Aucun attribut disponible. Créez d'abord des attributs (Couleur, Taille…).
          </p>
        ) : (
          attributes.map((attr) => (
            <div key={attr.id}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {attr.name}
              </p>
              <div className="flex flex-wrap gap-2">
                {attr.values.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggle(attr.id, v.id)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      selected[attr.id] === v.id
                        ? 'border-brand-primary bg-brand-primary text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}

        {label && (
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-500">Combinaison : </span>
            <span className="font-medium text-gray-900">{label}</span>
            {alreadyExists && (
              <span className="ml-2 text-xs text-red-500 font-medium">— déjà existante</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="SKU (optionnel)"
            placeholder="TSH-XXL-001"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <Input
            label="Prix spécifique (FCFA)"
            type="number"
            min={0}
            placeholder="Hérité du produit"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
