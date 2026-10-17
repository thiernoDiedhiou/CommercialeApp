import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getShopOrder, getShopOrders, updateShopOrderStatus } from '@/shop/services/shop'
import type { ShopOrderAdmin, ShopOrderAdminItem } from '@/shop/services/shop'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/utils'
import { XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/outline'
import EmptyState from '@/components/ui/EmptyState'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_CSS: Record<string, { bg: string; text: string }> = {
  pending  : { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  confirmed: { bg: 'bg-blue-100',   text: 'text-blue-800'   },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-800' },
  shipped  : { bg: 'bg-purple-100', text: 'text-purple-800' },
  delivered: { bg: 'bg-green-100',  text: 'text-green-800'  },
  cancelled: { bg: 'bg-red-100',    text: 'text-red-800'    },
}

const NEXT_STATUS: Record<string, string> = {
  pending  : 'confirmed',
  confirmed: 'preparing',
  preparing: 'shipped',
  shipped  : 'delivered',
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ShopOrdersPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  // Filtres
  const [statusFilter, setStatusFilter] = useState('')
  const [searchInput,  setSearchInput]  = useState('')
  const [debSearch,    setDebSearch]    = useState('')
  const [fromDate,     setFromDate]     = useState('')
  const [toDate,       setToDate]       = useState('')
  const [page,         setPage]         = useState(1)

  // Modal détail
  const [detailUid,   setDetailUid]   = useState<string | null>(null)
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
    queryKey: ['shop-order', detailUid],
    queryFn : () => getShopOrder(detailUid!),
    enabled : !!detailUid,
  })

  // ── Mutation statut ────────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) =>
      updateShopOrderStatus(uid, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop-orders'] })
      qc.invalidateQueries({ queryKey: ['shop-order', detailUid] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success(t('shop_orders.status_updated'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const orders      = data?.data ?? []
  const lastPage    = data?.last_page ?? 1
  const total       = data?.total ?? 0

  const openDetail  = (uid: string) => { setDetailUid(uid); setDetailOpen(true) }
  const closeDetail = () => { setDetailOpen(false); setDetailUid(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t('shop_orders.title')}</h1>
        <span className="text-sm text-gray-500">{t('shop_orders.order_count', { count: total })}</span>
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder={t('shop_orders.search_placeholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors"
        />

        <select
          aria-label={t('shop_orders.filter_status_label')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 bg-white"
        >
          <option value="">{t('shop_orders.all_statuses')}</option>
          {Object.keys(STATUS_CSS).map((k) => (
            <option key={k} value={k}>{t(`shop_orders.status_${k}`)}</option>
          ))}
        </select>

        <input type="date" aria-label="Date de début" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900" />
        <input type="date" aria-label="Date de fin" value={toDate} onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900" />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 rounded-full border-4 border-gray-200 border-t-gray-500 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState icon={<ShoppingBagIcon className="h-7 w-7" />} title={t('shop_orders.empty_title')} description={t('shop_orders.empty_desc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {([
                    t('shop_orders.col_ref'),
                    t('shop_orders.col_customer'),
                    t('shop_orders.col_phone'),
                    t('common.total'),
                    t('shop_orders.col_method'),
                    t('common.status'),
                    t('common.date'),
                    t('common.actions'),
                  ]).map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <OrderRow
                    key={order.uid}
                    order={order}
                    onDetail={() => openDetail(order.uid)}
                    onStatus={(status) => statusMutation.mutate({ uid: order.uid, status })}
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
          onStatus={(status) => statusMutation.mutate({ uid: detailUid!, status })}
          isUpdating={statusMutation.isPending}
        />
      )}
    </div>
  )
}

// ── OrderRow ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const css = STATUS_CSS[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  const label = STATUS_CSS[status] ? t(`shop_orders.status_${status}`) : status
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${css.bg} ${css.text}`}>
      {label}
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
  const { t } = useTranslation()
  const [pending, setPending] = useState<{ status: string; label: string } | null>(null)

  const NEXT_LABEL: Record<string, string> = {
    pending  : t('shop_orders.action_confirm'),
    confirmed: t('shop_orders.action_prepare'),
    preparing: t('shop_orders.action_ship'),
    shipped  : t('shop_orders.action_deliver'),
  }

  const nextStatus = NEXT_STATUS[order.status]
  const canCancel  = !['delivered', 'cancelled'].includes(order.status)

  const ask = (status: string, label: string) => setPending({ status, label })
  const confirm = () => { if (pending) { onStatus(pending.status); setPending(null) } }
  const cancel  = () => setPending(null)

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{order.reference}</td>
      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{order.customer_name}</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{order.customer_phone}</td>
      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
        {Math.round(order.total).toLocaleString('fr-FR')} F
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap capitalize">
        {order.payment_method === 'cod' ? t('shop_orders.payment_cod') : 'WhatsApp'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={order.status} />
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
        {formatDateTime(order.created_at)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {pending ? (
          /* ── Confirmation inline ── */
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-600">{pending.label} ?</span>
            <button type="button" disabled={isUpdating} onClick={confirm}
              className="px-2.5 py-1 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 disabled:opacity-50">
              {t('common.yes')}
            </button>
            <button type="button" onClick={cancel}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50">
              {t('common.no')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {nextStatus && (
              <button type="button" disabled={isUpdating}
                onClick={() => ask(nextStatus, NEXT_LABEL[order.status])}
                className="px-3 py-1 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 disabled:opacity-50">
                {NEXT_LABEL[order.status]}
              </button>
            )}
            {canCancel && (
              <button type="button" disabled={isUpdating}
                onClick={() => ask('cancelled', t('shop_orders.action_cancel_order'))}
                className="px-3 py-1 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-50">
                {t('common.cancel')}
              </button>
            )}
            <button type="button" onClick={onDetail}
              className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50">
              {t('common.details')}
            </button>
          </div>
        )}
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
  const { t } = useTranslation()
  const [pending, setPending] = useState<{ status: string; label: string } | null>(null)

  const NEXT_LABEL: Record<string, string> = {
    pending  : t('shop_orders.action_confirm'),
    confirmed: t('shop_orders.action_prepare'),
    preparing: t('shop_orders.action_ship'),
    shipped  : t('shop_orders.action_deliver'),
  }

  const ask     = (status: string, label: string) => setPending({ status, label })
  const confirm = () => { if (pending) { onStatus(pending.status); setPending(null) } }
  const cancel  = () => setPending(null)

  if (!order) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-4 border-gray-200 border-t-gray-500 animate-spin" />
          <span className="text-sm text-gray-500">{t('common.loading')}</span>
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
            <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Client */}
          <Section title={t('shop_orders.section_customer')}>
            <Row label={t('common.name')}      value={order.customer_name} />
            <Row label={t('common.phone')} value={order.customer_phone} />
            {order.customer_email  && <Row label={t('common.email')}    value={order.customer_email} />}
            {order.customer_address && <Row label={t('shop_orders.label_address')} value={order.customer_address} />}
            {order.delivery_zone   && <Row label={t('shop_orders.label_delivery_zone')} value={order.delivery_zone} />}
            {order.notes           && <Row label={t('shop_orders.label_notes')}   value={order.notes} />}
          </Section>

          {/* Articles */}
          {order.items && order.items.length > 0 && (
            <Section title={t('shop_orders.section_items')}>
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
          <Section title={t('shop_orders.section_totals')}>
            <Row label={t('common.subtotal')} value={`${Math.round(order.subtotal).toLocaleString('fr-FR')} FCFA`} />
            {order.delivery_fee > 0 && (
              <Row label={t('shop_orders.label_delivery_fee')} value={`${Math.round(order.delivery_fee).toLocaleString('fr-FR')} FCFA`} />
            )}
            <Row label={t('common.total')} value={`${Math.round(order.total).toLocaleString('fr-FR')} FCFA`} bold />
            <Row label={t('shop_orders.label_payment')} value={order.payment_method === 'cod' ? t('shop_orders.payment_cod_long') : 'WhatsApp'} />
          </Section>

          {/* Actions */}
          {pending ? (
            /* ── Confirmation inline ── */
            <div className="flex items-center gap-3 pt-1 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-700 flex-1">
                {t('shop_orders.confirm_action', { label: pending.label })}
              </p>
              <button type="button" disabled={isUpdating} onClick={confirm}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                {t('common.yes')}
              </button>
              <button type="button" onClick={cancel}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-100">
                {t('common.no')}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {nextStatus && (
                <button type="button" disabled={isUpdating}
                  onClick={() => ask(nextStatus, NEXT_LABEL[order.status])}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                  {NEXT_LABEL[order.status]}
                </button>
              )}
              {canCancel && (
                <button type="button" disabled={isUpdating}
                  onClick={() => ask('cancelled', t('shop_orders.action_cancel_order'))}
                  className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                  {t('common.cancel')}
                </button>
              )}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:opacity-90">
                  WhatsApp
                </a>
              )}
            </div>
          )}
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
