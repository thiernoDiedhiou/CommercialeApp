import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  PlusIcon,
  ArrowRightIcon,
  TrashIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { getBranches } from '@/services/api/branches'
import {
  getStockTransfers,
  getStockTransfer,
  createStockTransfer,
  sendStockTransfer,
  receiveStockTransfer,
  cancelStockTransfer,
} from '@/services/api/stockTransfers'
import { getProducts } from '@/services/api/products'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import CanDo from '@/components/ui/CanDo'
import type { StockTransfer, StockTransferStatus } from '@/types'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_META: Record<StockTransferStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger' }> = {
  draft:      { label: 'Brouillon',  variant: 'default'  },
  in_transit: { label: 'En transit', variant: 'warning'  },
  received:   { label: 'Reçu',       variant: 'success'  },
  cancelled:  { label: 'Annulé',     variant: 'danger'   },
}

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  from_branch_uid: z.string().min(1, 'Succursale source requise'),
  to_branch_uid:   z.string().min(1, 'Succursale destination requise'),
  notes:           z.string().max(1000).optional(),
  items: z.array(z.object({
    product_uid:          z.string().min(1, 'Produit requis'),
    product_variant_uid:  z.string().optional(),
    quantity:             z.number({ invalid_type_error: 'Quantité requise' }).min(0.001, 'Quantité > 0'),
    notes:                z.string().max(500).optional(),
  })).min(1, 'Au moins un article requis'),
})

type CreateValues = z.infer<typeof createSchema>

// ── Modal Création ────────────────────────────────────────────────────────────

function CreateTransferModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { availableBranches } = useAuthStore()
  const [productSearch, setProductSearch] = useState('')

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
    initialData: availableBranches,
  })

  const { data: productsRes } = useQuery({
    queryKey: ['products', 'transfer-search', productSearch],
    queryFn: () => getProducts({ search: productSearch }),
    enabled: true,
  })

  const products = productsRes?.data ?? []

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      from_branch_uid: availableBranches[0]?.uid ?? '',
      items: [{ product_uid: '', quantity: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const fromUid = watch('from_branch_uid')

  const mutation = useMutation({
    mutationFn: createStockTransfer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-transfers'] })
      toast.success('Transfert créé')
      onClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return (
    <Modal isOpen title="Nouveau transfert de stock" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">

        {/* Source / Destination */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              De (source) *
            </label>
            <Select {...register('from_branch_uid')}>
              <option value="">— Succursale —</option>
              {branches.map((b) => (
                <option key={b.uid} value={b.uid}>{b.name}</option>
              ))}
            </Select>
            {errors.from_branch_uid && (
              <p className="mt-1 text-xs text-red-500">{errors.from_branch_uid.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vers (destination) *
            </label>
            <Select {...register('to_branch_uid')}>
              <option value="">— Succursale —</option>
              {branches.filter((b) => b.uid !== fromUid).map((b) => (
                <option key={b.uid} value={b.uid}>{b.name}</option>
              ))}
            </Select>
            {errors.to_branch_uid && (
              <p className="mt-1 text-xs text-red-500">{errors.to_branch_uid.message}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <Input {...register('notes')} placeholder="Commentaire optionnel" />
        </div>

        {/* Recherche produit */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>

        {/* Articles */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Articles *
            {errors.items?.root && (
              <span className="ml-2 text-xs text-red-500">{errors.items.root.message}</span>
            )}
          </div>

          {fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <Controller
                  control={control}
                  name={`items.${idx}.product_uid`}
                  render={({ field: f }) => (
                    <Select {...f} className={errors.items?.[idx]?.product_uid ? 'border-red-300' : ''}>
                      <option value="">— Produit —</option>
                      {products.map((p) => (
                        <option key={p.uid} value={p.uid}>
                          {p.name} {p.sku ? `(${p.sku})` : ''}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <div className="w-28">
                <Controller
                  control={control}
                  name={`items.${idx}.quantity`}
                  render={({ field: f }) => (
                    <Input
                      {...f}
                      type="number"
                      min="0.001"
                      step="any"
                      onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                      placeholder="Qté"
                      className={errors.items?.[idx]?.quantity ? 'border-red-300' : ''}
                    />
                  )}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={fields.length === 1}
                className="mt-0.5 p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors"
                aria-label="Supprimer la ligne"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            onClick={() => append({ product_uid: '', quantity: 1 })}
            className="text-sm"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Ajouter un article
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Création…' : 'Créer le transfert'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal Détail ──────────────────────────────────────────────────────────────

function TransferDetailModal({ transfer, onClose }: { transfer: StockTransfer; onClose: () => void }) {
  const qc = useQueryClient()

  const { data: full } = useQuery({
    queryKey: ['stock-transfers', transfer.uid],
    queryFn: () => getStockTransfer(transfer.uid),
    initialData: transfer,
  })

  const sendMutation = useMutation({
    mutationFn: () => sendStockTransfer(transfer.uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); toast.success('Transfert expédié') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const receiveMutation = useMutation({
    mutationFn: () => receiveStockTransfer(transfer.uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); toast.success('Transfert reçu') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelStockTransfer(transfer.uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); toast.success('Transfert annulé'); onClose() },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const tf: StockTransfer = full ?? transfer
  const statusMeta = STATUS_META[tf.status]
  const isPending = sendMutation.isPending || receiveMutation.isPending || cancelMutation.isPending

  return (
    <Modal isOpen title={`Transfert ${tf.reference ?? ''}`} onClose={onClose}>
      <div className="space-y-4">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          <span className="text-xs text-gray-400">{formatDateTime(tf.created_at)}</span>
        </div>

        {/* Branches */}
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 px-4 py-3">
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Source</p>
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{tf.from_branch?.name ?? '—'}</p>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-gray-400 shrink-0" />
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Destination</p>
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{tf.to_branch?.name ?? '—'}</p>
          </div>
        </div>

        {/* Articles */}
        {tf.items && tf.items.length > 0 && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {tf.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.product?.name ?? '—'}
                  </p>
                  {item.variant && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.variant.attribute_summary}</p>
                  )}
                </div>
                <span className="ml-3 text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                  ×{item.quantity}
                  {item.product?.unit ? ` ${item.product.unit}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {tf.notes && (
          <p className="text-sm text-gray-600 dark:text-gray-300 italic">{tf.notes}</p>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
          {tf.sent_at && (
            <div><span className="font-medium">Expédié :</span> {formatDateTime(tf.sent_at)}</div>
          )}
          {tf.received_at && (
            <div><span className="font-medium">Reçu :</span> {formatDateTime(tf.received_at)}</div>
          )}
          {tf.created_by && (
            <div><span className="font-medium">Créé par :</span> {tf.created_by}</div>
          )}
          {tf.received_by && (
            <div><span className="font-medium">Réceptionné par :</span> {tf.received_by}</div>
          )}
        </div>

        {/* Actions */}
        <CanDo permission="stock.transfer">
          <div className="flex flex-wrap gap-2 pt-1">
            {tf.status === 'draft' && (
              <>
                <Button
                  type="button"
                  variant="primary"
                  disabled={isPending}
                  onClick={() => sendMutation.mutate()}
                >
                  <PaperAirplaneIcon className="h-4 w-4 mr-1.5" />
                  {sendMutation.isPending ? 'Expédition…' : 'Expédier'}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  <XCircleIcon className="h-4 w-4 mr-1.5" />
                  {cancelMutation.isPending ? 'Annulation…' : 'Annuler'}
                </Button>
              </>
            )}
            {tf.status === 'in_transit' && (
              <>
                <Button
                  type="button"
                  variant="primary"
                  disabled={isPending}
                  onClick={() => receiveMutation.mutate()}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                  {receiveMutation.isPending ? 'Réception…' : 'Réceptionner'}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  <XCircleIcon className="h-4 w-4 mr-1.5" />
                  {cancelMutation.isPending ? 'Annulation…' : 'Annuler le transit'}
                </Button>
              </>
            )}
          </div>
        </CanDo>
      </div>
    </Modal>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function StockTransfersPage() {
  const [page, setPage]               = useState(1)
  const [status, setStatus]           = useState('')
  const [creating, setCreating]       = useState(false)
  const [selected, setSelected]       = useState<StockTransfer | null>(null)
  const { availableBranches, activeBranch } = useAuthStore()
  const [branchFilter, setBranchFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', { page, status, branchFilter, activeBranchUid: activeBranch?.uid }],
    queryFn: () => getStockTransfers({ status: status || undefined, branch_uid: branchFilter || undefined }),
  })

  const transfers = (data as { data: StockTransfer[] } | undefined)?.data ?? []
  const meta      = (data as { meta?: { last_page?: number } } | undefined)?.meta

  if (availableBranches.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 rounded-full bg-gray-100 dark:bg-gray-700 p-5">
          <ArrowRightIcon className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Transferts inter-succursales
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Cette fonctionnalité est disponible dès que vous avez configuré au moins deux succursales dans Paramètres → Succursales.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Transferts de stock</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Déplacez le stock entre vos succursales et entrepôts
          </p>
        </div>
        <CanDo permission="stock.transfer">
          <Button type="button" variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Nouveau transfert
          </Button>
        </CanDo>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <div className="w-40">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">Tous statuts</option>
            <option value="draft">Brouillon</option>
            <option value="in_transit">En transit</option>
            <option value="received">Reçu</option>
            <option value="cancelled">Annulé</option>
          </Select>
        </div>
        {availableBranches.length > 1 && (
          <div className="w-44">
            <Select value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); setPage(1) }}>
              <option value="">Toutes les succursales</option>
              {availableBranches.map((b) => (
                <option key={b.uid} value={b.uid}>{b.name}</option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : transfers.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucun transfert trouvé.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Référence</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">De → Vers</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
              {transfers.map((tr) => {
                const meta = STATUS_META[tr.status]
                return (
                  <tr
                    key={tr.uid}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                    onClick={() => setSelected(tr)}
                  >
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                      {tr.reference ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="flex items-center gap-1.5">
                        {tr.from_branch?.name ?? '—'}
                        <ArrowRightIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {tr.to_branch?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(tr.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-brand-primary">
                      Voir →
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && (meta as { last_page?: number; total?: number; per_page?: number }).last_page && (meta as { last_page: number }).last_page > 1 && (
        <Pagination
          currentPage={page}
          lastPage={(meta as { last_page: number }).last_page}
          total={(meta as { total?: number }).total ?? 0}
          perPage={(meta as { per_page?: number }).per_page ?? 15}
          onPageChange={setPage}
        />
      )}

      {creating  && <CreateTransferModal onClose={() => setCreating(false)} />}
      {selected  && <TransferDetailModal transfer={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
