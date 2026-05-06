import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, CheckIcon, XCircleIcon, TruckIcon } from '@heroicons/react/24/outline'
import {
  getPurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  receivePurchaseOrder,
} from '@/services/api/purchases'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import CanDo from '@/components/ui/CanDo'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PurchaseOrderStatus } from '@/types'

const STATUS_VARIANT: Record<PurchaseOrderStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft:     'default',
  ordered:   'info',
  partial:   'warning',
  received:  'success',
  cancelled: 'danger',
}

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft:     'Brouillon',
  ordered:   'Commandé',
  partial:   'Partiel',
  received:  'Réceptionné',
  cancelled: 'Annulé',
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => getPurchaseOrder(Number(id)),
  })

  const [showConfirm, setShowConfirm] = useState(false)
  const [showCancel, setShowCancel]   = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const [receivedQtys, setReceivedQtys] = useState<Record<number, string>>({})

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['purchase', id] })
    qc.invalidateQueries({ queryKey: ['purchases'] })
  }

  const confirmMutation = useMutation({
    mutationFn: () => confirmPurchaseOrder(Number(id)),
    onSuccess: () => { invalidate(); setShowConfirm(false); toast.success('Commande confirmée.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelPurchaseOrder(Number(id)),
    onSuccess: () => { invalidate(); setShowCancel(false); toast.success('Commande annulée.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const receiveMutation = useMutation({
    mutationFn: () => {
      const receptions = Object.entries(receivedQtys)
        .map(([itemId, qty]) => ({ id: Number(itemId), quantity_received: parseFloat(qty) || 0 }))
        .filter((r) => r.quantity_received > 0)
      return receivePurchaseOrder(Number(id), receptions)
    },
    onSuccess: () => { invalidate(); setShowReceive(false); setReceivedQtys({}); toast.success('Réception enregistrée.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Chargement…</div>
  if (!order) return <div className="p-6 text-sm text-gray-400">Bon de commande introuvable.</div>

  const canConfirm = order.status === 'draft'
  const canCancel  = order.status === 'draft' || order.status === 'ordered'
  const canReceive = order.status === 'ordered' || order.status === 'partial'
  const itemsTotal = (order.items ?? []).reduce(
    (sum, i) => sum + parseFloat(i.quantity_ordered) * parseFloat(i.unit_cost),
    0,
  )
  const receivableItems = (order.items ?? []).filter(
    (i) => parseFloat(i.quantity_ordered) - parseFloat(i.quantity_received) > 0
  )

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/purchases')}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Retour">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-bold text-gray-900">{order.reference}</h1>
              <Badge variant={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {order.supplier ? order.supplier.name : 'Sans fournisseur'}
              {' · '}
              {formatDate(order.created_at)}
              {order.expected_at && ` · Livraison prévue le ${formatDate(order.expected_at)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <CanDo permission="purchases.edit">
              <Button variant="outline" icon={<CheckIcon className="h-4 w-4" />} onClick={() => setShowConfirm(true)}>
                Confirmer
              </Button>
            </CanDo>
          )}
          {canReceive && (
            <CanDo permission="purchases.receive">
              <Button icon={<TruckIcon className="h-4 w-4" />} onClick={() => setShowReceive(true)}>
                Réceptionner
              </Button>
            </CanDo>
          )}
          {canCancel && (
            <CanDo permission="purchases.edit">
              <Button variant="danger" icon={<XCircleIcon className="h-4 w-4" />} onClick={() => setShowCancel(true)}>
                Annuler
              </Button>
            </CanDo>
          )}
        </div>
      </div>

      {/* Table articles */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Produit</th>
                <th className="px-4 py-3 text-right font-medium">Commandé</th>
                <th className="px-4 py-3 text-right font-medium">Reçu</th>
                <th className="px-4 py-3 text-right font-medium">Reliquat</th>
                <th className="px-4 py-3 text-right font-medium">Coût unit.</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(order.items ?? []).map((item) => {
                const remaining  = parseFloat(item.quantity_ordered) - parseFloat(item.quantity_received)
                const lineTotal  = parseFloat(item.quantity_ordered) * parseFloat(item.unit_cost)
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.product?.name ?? `Produit #${item.product_id}`}</p>
                      {item.variant && <p className="text-xs text-gray-500">{item.variant.attribute_summary}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.quantity_ordered}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">{item.quantity_received}</td>
                    <td className={`px-4 py-3 text-right font-medium ${remaining > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {remaining > 0 ? String(parseFloat(remaining.toFixed(3))) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.unit_cost)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(lineTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100">
                <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right text-base font-bold text-gray-900">{formatCurrency(itemsTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</p>
          <p className="mt-1 text-sm text-gray-700">{order.notes}</p>
        </div>
      )}

      {/* Modal confirmer */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirmer la commande" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button loading={confirmMutation.isPending} onClick={() => confirmMutation.mutate()}>Confirmer</Button>
        </>}
      >
        <p className="text-sm text-gray-600">Le statut passera à "Commandé". Vous pourrez réceptionner les articles à la livraison.</p>
      </Modal>

      {/* Modal annuler */}
      <Modal isOpen={showCancel} onClose={() => setShowCancel(false)} title="Annuler le bon de commande" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setShowCancel(false)}>Retour</Button>
          <Button variant="danger" loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>Annuler le bon</Button>
        </>}
      >
        <p className="text-sm text-gray-600">Voulez-vous annuler ce bon de commande ? Aucun stock ne sera affecté.</p>
      </Modal>

      {/* Modal réception */}
      <Modal
        isOpen={showReceive}
        onClose={() => { setShowReceive(false); setReceivedQtys({}) }}
        title="Réceptionner les articles"
        size="md"
        footer={<>
          <Button variant="outline" onClick={() => { setShowReceive(false); setReceivedQtys({}) }}>Annuler</Button>
          <Button loading={receiveMutation.isPending} onClick={() => receiveMutation.mutate()}>
            Valider la réception
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Saisissez les quantités effectivement reçues.</p>
          <div className="divide-y divide-gray-100">
            {receivableItems.map((item) => {
              const remaining = parseFloat(item.quantity_ordered) - parseFloat(item.quantity_received)
              return (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.product?.name ?? `Produit #${item.product_id}`}</p>
                    <p className="text-xs text-gray-500">Reliquat : {String(parseFloat(remaining.toFixed(3)))}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={remaining}
                    step="0.001"
                    value={receivedQtys[item.id] ?? ''}
                    onChange={(e) => setReceivedQtys((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder={`Max ${parseFloat(remaining.toFixed(3))}`}
                    className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </div>
  )
}
