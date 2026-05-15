import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getShopOrder, getShopOrders, updateShopOrderStatus } from '@/shop/services/shop'
import type { ShopOrderAdmin, ShopOrderAdminItem } from '@/shop/services/shop'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/utils'
import { XMarkIcon } from '@heroicons/react/24/outline'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending  : { label: 'En attente',  bg: 'bg-yellow-100', text: 'text-yellow-800' },
  confirmed: { label: 'Confirmée',   bg: 'bg-blue-100',   text: 'text-blue-800'   },
  preparing: { label: 'En prép.',    bg: 'bg-orange-100', text: 'text-orange-800' },
  shipped  : { label: 'Expédiée',    bg: 'bg-purple-100', text: 'text-purple-800' },
  delivered: { label: 'Livrée',      bg: 'bg-green-100',  text: 'text-green-800'  },
  cancelled: { label: 'Annulée',     bg: 'bg-red-100',    text: 'text-red-800'    },
}

const NEXT_STATUS: Record<string, string> = {
  pending  : 'confirmed',
  confirmed: 'preparing',
  preparing: 'shipped',
  shipped  : 'delivered',
}

const NEXT_LABEL: Record<string, string> = {
  pending  : 'Confirmer',
  confirmed: 'Préparer',
  preparing: 'Expédier',
  shipped  : 'Livré',
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ShopOrdersPage() {
  const qc = useQueryClient()

  // Filtres
  const [statusFilter, setStatusFilter] = useState('')
  const [searchInput,  setSearchInput]  = useState('')
  const [debSearch,    setDebSearch]    = useState('')
  const [fromDate,     setFromDate]     = useState('')
  const [toDate,       setToDate]       = useState('')
  const [page,         setPage]         = useState(1)

  // Modal détail
  const [detailId,    setDetailId]    = useState<number | null>(null)
  const [detailOpen,  setDetailOpen]  = useState(false)

  const debRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    clearTimeout(debRef.current)
    debRef.current = setTimeout(() => { setDebSearch(searchInput); setPage(1) }, 300)
    return () => clearTimeout(debRef.current)
  }, [searchInput])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [statusFilter, fromDate, toDate])

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['shop-orders', statusFilter, debSearch, fromDate, toDate, page],
    queryFn : () => getShopOrders({
      status: statusFilter || undefined,
      search: debSearch   || undefined,
      from  : fromDate    || undefined,
      to    : toDate      || undefined,
      page,
    }),
    staleTime: 30_000,
  })

  const { data: detailResp } = useQuery({
    queryKey: ['shop-order', detailId],
    queryFn : () => getShopOrder(detailId!),
    enabled : !!detailId,
  })

  // ── Mutation statut ────────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateShopOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop-orders'] })
      qc.invalidateQueries({ queryKey: ['shop-order', detailId] })
      toast.success('Statut mis à jour')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const orders      = data?.data ?? []
  const lastPage    = data?.last_page ?? 1
  const total       = data?.total ?? 0

  const openDetail = (id: number) => { setDetailId(id); setDetailOpen(true) }
  const closeDetail = () => { setDetailOpen(false); setDetailId(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Commandes boutique</h1>
        <span className="text-sm text-gray-500">{total} commande{total !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher (référence, client)…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 bg-white"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900" />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 rounded-full border-4 border-gray-200 border-t-gray-500 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">Aucune commande</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Référence','Client','Téléphone','Total','Méthode','Statut','Date','Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onDetail={() => openDetail(order.id)}
                    onStatus={(status) => statusMutation.mutate({ id: order.id, status })}
                    isUpdating={statusMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
            ←
          </button>
          <span className="text-sm text-gray-600">{page} / {lastPage}</span>
          <button type="button" disabled={page >= lastPage} onClick={() => setPage(page + 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
            →
          </button>
        </div>
      )}

      {/* ── Modal détail ────────────────────────────────────────────────── */}
      {detailOpen && (
        <OrderDetailModal
          order={detailResp?.data ?? null}
          whatsappUrl={detailResp?.whatsapp_url ?? null}
          onClose={closeDetail}
          onStatus={(status) => statusMutation.mutate({ id: detailId!, status })}
          isUpdating={statusMutation.isPending}
        />
      )}
    </div>
  )
}

// ── OrderRow ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

function OrderRow({
  order, onDetail, onStatus, isUpdating,
}: {
  order: ShopOrderAdmin
  onDetail: () => void
  onStatus: (s: string) => void
  isUpdating: boolean
}) {
  const nextStatus = NEXT_STATUS[order.status]
  const canCancel  = !['delivered', 'cancelled'].includes(order.status)

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{order.reference}</td>
      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{order.customer_name}</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{order.customer_phone}</td>
      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
        {Math.round(order.total).toLocaleString('fr-FR')} F
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap capitalize">
        {order.payment_method === 'cod' ? 'Livraison' : 'WhatsApp'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={order.status} />
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
        {formatDateTime(order.created_at)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          {nextStatus && (
            <button type="button" disabled={isUpdating} onClick={() => onStatus(nextStatus)}
              className="px-3 py-1 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 disabled:opacity-50">
              {NEXT_LABEL[order.status]}
            </button>
          )}
          {canCancel && (
            <button type="button" disabled={isUpdating} onClick={() => onStatus('cancelled')}
              className="px-3 py-1 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-50">
              Annuler
            </button>
          )}
          <button type="button" onClick={onDetail}
            className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50">
            Détail
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── OrderDetailModal ──────────────────────────────────────────────────────────

function OrderDetailModal({
  order, whatsappUrl, onClose, onStatus, isUpdating,
}: {
  order        : ShopOrderAdmin | null
  whatsappUrl  : string | null
  onClose      : () => void
  onStatus     : (s: string) => void
  isUpdating   : boolean
}) {
  if (!order) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-4 border-gray-200 border-t-gray-500 animate-spin" />
          <span className="text-sm text-gray-500">Chargement…</span>
        </div>
      </div>
    )
  }

  const nextStatus = NEXT_STATUS[order.status]
  const canCancel  = !['delivered', 'cancelled'].includes(order.status)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100 z-10">
          <div>
            <h2 className="font-semibold text-gray-900">{order.reference}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Client */}
          <Section title="Client">
            <Row label="Nom"      value={order.customer_name} />
            <Row label="Téléphone" value={order.customer_phone} />
            {order.customer_email  && <Row label="Email"    value={order.customer_email} />}
            {order.customer_address && <Row label="Adresse" value={order.customer_address} />}
            {order.delivery_zone   && <Row label="Zone livraison" value={order.delivery_zone} />}
            {order.notes           && <Row label="Notes"   value={order.notes} />}
          </Section>

          {/* Articles */}
          {order.items && order.items.length > 0 && (
            <Section title="Articles">
              <div className="space-y-2">
                {order.items.map((item: ShopOrderAdminItem) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.product_name}
                      {item.variant_name && <span className="text-gray-400"> · {item.variant_name}</span>}
                      <span className="text-gray-400"> × {item.quantity}</span>
                    </span>
                    <span className="font-medium text-gray-900">
                      {Math.round(item.total).toLocaleString('fr-FR')} F
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Totaux */}
          <Section title="Totaux">
            <Row label="Sous-total" value={`${Math.round(order.subtotal).toLocaleString('fr-FR')} FCFA`} />
            {order.delivery_fee > 0 && (
              <Row label="Livraison" value={`${Math.round(order.delivery_fee).toLocaleString('fr-FR')} FCFA`} />
            )}
            <Row label="Total" value={`${Math.round(order.total).toLocaleString('fr-FR')} FCFA`} bold />
            <Row label="Paiement" value={order.payment_method === 'cod' ? 'À la livraison' : 'WhatsApp'} />
          </Section>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {nextStatus && (
              <button type="button" disabled={isUpdating} onClick={() => onStatus(nextStatus)}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                {NEXT_LABEL[order.status]}
              </button>
            )}
            {canCancel && (
              <button type="button" disabled={isUpdating} onClick={() => onStatus('cancelled')}
                className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                Annuler
              </button>
            )}
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:opacity-90">
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Petits helpers UI ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-700'}>{value}</span>
    </div>
  )
}
