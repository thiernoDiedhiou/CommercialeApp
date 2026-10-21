import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { PlusIcon, AdjustmentsHorizontalIcon, ClipboardDocumentListIcon, TrashIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import CanDo from '@/components/ui/CanDo'
import Modal from '@/components/ui/Modal'
import { StockAdjustModal, type StockAdjustPrefill } from '@/components/stock/StockAdjustModal'
import { getMovements, getAlerts, getExpiring } from '@/services/api/stock'
import { getInventorySessions, createInventorySession, deleteInventorySession } from '@/services/api/inventory'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import type { StockMovement, StockAlert, InventorySession } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'movements' | 'alerts' | 'expiring' | 'inventaire'

function movementDesignation(m: StockMovement): string {
  return [m.product?.name, m.variant?.attribute_summary].filter(Boolean).join(' — ')
}

// ── Sub-tabs ──────────────────────────────────────────────────────────────

function MovementsTab() {
  const { t } = useTranslation()
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  // Reset page on filter change
  useEffect(() => setPage(1), [type, from, to])

  const TYPE_BADGE: Record<string, { variant: 'success' | 'danger' | 'warning' | 'default'; label: string }> = {
    in:         { variant: 'success', label: t('stock.in') },
    out:        { variant: 'danger',  label: t('stock.out') },
    adjustment: { variant: 'warning', label: t('stock.type_adjustment') },
    return:     { variant: 'default', label: t('stock.type_return') },
  }

  const SOURCE_LABEL: Record<string, string> = {
    manual:   t('stock.source_manual'),
    sale:     t('stock.source_sale'),
    purchase: t('stock.source_purchase'),
    return:   t('stock.source_return'),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['stock', 'movements', type, from, to, page],
    queryFn: () => getMovements({ type: type || undefined, from: from || undefined, to: to || undefined, page }),
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('stock.filter_type')}</label>
          <select
            title={t('stock.filter_movements')}
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-600 py-2 px-3 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="">{t('common.all')}</option>
            <option value="in">{t('stock.in')}</option>
            <option value="out">{t('stock.out')}</option>
            <option value="adjustment">{t('stock.type_adjustment')}</option>
            <option value="sale">{t('stock.source_sale')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('stock.filter_from')}</label>
          <input
            type="date"
            title={t('stock.filter_date_from')}
            placeholder="jj/mm/aaaa"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 py-2 px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('stock.filter_to')}</label>
          <input
            type="date"
            title={t('stock.filter_date_to')}
            placeholder="jj/mm/aaaa"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 py-2 px-3 text-sm"
          />
        </div>
        {(type || from || to) && (
          <button
            type="button"
            onClick={() => { setType(''); setFrom(''); setTo('') }}
            className="text-xs text-brand-primary hover:underline self-end pb-2"
          >
            {t('stock.reset_filters')}
          </button>
        )}
      </div>

      {/* ── Vue tableau (sm+) ───────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {[t('stock.date'), t('stock.product'), t('stock.type'), t('stock.quantity'), t('stock.title'), t('stock.col_operator'), t('stock.source')].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (data?.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-700">
                      <ArrowsUpDownIcon className="h-7 w-7 text-slate-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('stock.empty_title')}</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">{t('stock.empty_movements')}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data?.data.map((m) => {
                const badge = TYPE_BADGE[m.type] ?? { variant: 'default' as const, label: m.type }
                const qtySign = m.type === 'out' ? '-' : m.type === 'in' ? '+' : ''
                const qtyColor = m.type === 'in' ? 'text-green-600' : m.type === 'out' ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'
                return (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(m.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-[200px]">
                      <p className="truncate">{movementDesignation(m)}</p>
                      {m.lot && <p className="text-xs text-gray-400 dark:text-gray-500">{t('stock.lot_prefix')} {m.lot.lot_number}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className={`px-4 py-3 font-semibold tabular-nums ${qtyColor}`}>
                      {qtySign}{m.quantity}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
                      {m.stock_before} → {m.stock_after}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {m.user?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">
                      {SOURCE_LABEL[m.source] ?? m.source}
                      {m.unit_cost && (
                        <span className="ml-1">· {formatCurrency(m.unit_cost)}/u</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Vue carte (mobile) ───────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))
        ) : (data?.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-700">
              <ArrowsUpDownIcon className="h-7 w-7 text-slate-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('stock.empty_title')}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">{t('stock.empty_movements')}</p>
          </div>
        ) : (
          data?.data.map((m) => {
            const badge = TYPE_BADGE[m.type] ?? { variant: 'default' as const, label: m.type }
            const qtySign = m.type === 'out' ? '-' : m.type === 'in' ? '+' : ''
            const qtyColor = m.type === 'in' ? 'text-green-600' : m.type === 'out' ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'
            return (
              <div key={m.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate flex-1">{movementDesignation(m)}</p>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-lg font-bold tabular-nums ${qtyColor}`}>{qtySign}{m.quantity}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{m.stock_before} → {m.stock_after}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>{formatDateTime(m.created_at)}</span>
                  <span>{SOURCE_LABEL[m.source] ?? m.source}{m.unit_cost ? ` · ${formatCurrency(m.unit_cost)}/u` : ''}</span>
                </div>
                {m.user && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{m.user.name}</p>}
              </div>
            )
          })
        )}
      </div>

      {data && data.last_page > 1 && (
        <Pagination
          currentPage={data.current_page}
          lastPage={data.last_page}
          total={data.total}
          perPage={data.per_page}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

function AlertsTab({ onAdjust }: { onAdjust: (prefill: StockAdjustPrefill) => void }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => setPage(1), [debouncedSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['stock', 'alerts', debouncedSearch, page],
    queryFn: () => getAlerts({ search: debouncedSearch || undefined, page }),
  })

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('stock.search')}
        className="w-full max-w-xs rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 px-3 py-2 text-sm outline-none focus:border-brand-primary transition"
      />

      {/* ── Vue tableau (sm+) ───────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {[t('stock.product'), t('stock.variant'), t('common.category'), t('stock.current_stock'), t('stock.threshold'), t('stock.state'), ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  {t('stock.no_alerts')}
                </td>
              </tr>
            ) : (
              data?.data.map((alert: StockAlert) => (
                <tr key={`${alert.product_id}-${alert.variant_id ?? 'base'}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{alert.product_name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{alert.variant_summary ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500">{alert.category_name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {alert.current_stock}
                    {alert.unit && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">{alert.unit}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 tabular-nums">{alert.threshold}</td>
                  <td className="px-4 py-3">
                    <Badge variant={alert.current_stock <= 0 ? 'danger' : 'warning'}>
                      {alert.current_stock <= 0 ? t('stock.out_of_stock') : t('stock.low_stock')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <CanDo permission="stock.adjust">
                      <button
                        type="button"
                        onClick={() => onAdjust({
                          product_id: alert.product_id,
                          product_name: alert.product_name,
                          variant_id: alert.variant_id,
                          variant_summary: alert.variant_summary,
                        })}
                        className="flex items-center gap-1 text-xs text-brand-primary hover:opacity-70 font-medium transition"
                      >
                        <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                        {t('stock.adjust_action')}
                      </button>
                    </CanDo>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Vue carte (mobile) ───────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))
        ) : data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">{t('stock.no_alerts')}</p>
        ) : (
          data?.data.map((alert: StockAlert) => (
            <div key={`${alert.product_id}-${alert.variant_id ?? 'base'}`} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{alert.product_name}</p>
                  {alert.variant_summary && <p className="text-xs text-gray-400 dark:text-gray-500">{alert.variant_summary}</p>}
                </div>
                <Badge variant={alert.current_stock <= 0 ? 'danger' : 'warning'}>
                  {alert.current_stock <= 0 ? t('stock.out_of_stock') : t('stock.low_stock')}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {alert.current_stock}{alert.unit ? ` ${alert.unit}` : ''}
                  <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">/ {t('stock.threshold')} {alert.threshold}</span>
                </span>
                <CanDo permission="stock.adjust">
                  <button
                    type="button"
                    onClick={() => onAdjust({
                      product_id: alert.product_id,
                      product_name: alert.product_name,
                      variant_id: alert.variant_id,
                      variant_summary: alert.variant_summary,
                    })}
                    className="flex items-center gap-1 text-xs text-brand-primary font-medium"
                  >
                    <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                    {t('stock.adjust_action')}
                  </button>
                </CanDo>
              </div>
            </div>
          ))
        )}
      </div>

      {data && data.last_page > 1 && (
        <Pagination
          currentPage={data.current_page}
          lastPage={data.last_page}
          total={data.total}
          perPage={data.per_page}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

function ExpiringTab() {
  const { t } = useTranslation()
  const [search, setSearch]               = useState('')
  const [debouncedSearch, setDebounced]   = useState('')
  const [days, setDays]                   = useState(30)
  const [page, setPage]                   = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch, days])

  const { data, isLoading } = useQuery({
    queryKey: ['stock', 'expiring', debouncedSearch, days, page],
    queryFn: () => getExpiring({ search: debouncedSearch || undefined, days, page }),
  })

  const hasFilters = !!search || days !== 30

  const DAYS_OPTIONS = [
    { value: 7,  label: t('stock.days_7') },
    { value: 15, label: t('stock.days_15') },
    { value: 30, label: t('stock.days_30') },
    { value: 60, label: t('stock.days_60') },
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('stock.search')}
          className="rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 px-3 py-2 text-sm outline-none focus:border-brand-primary transition w-full max-w-xs"
        />
        <div>
          <label htmlFor="expiring-days" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('stock.window_label')}</label>
          <select
            id="expiring-days"
            title={t('stock.filter_days')}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-gray-200 dark:border-gray-600 py-2 px-3 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
          >
            {DAYS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); setDays(30) }}
            className="text-xs text-brand-primary hover:underline self-end pb-2"
          >
            {t('stock.reset_filters')}
          </button>
        )}
      </div>

      {/* ── Vue tableau (sm+) ───────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {[t('stock.product'), t('stock.variant'), t('stock.lot_prefix'), t('stock.expiry_date_col'), t('stock.days_remaining'), t('common.quantity')].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  {debouncedSearch
                    ? t('stock.no_expiring_search', { search: debouncedSearch, days })
                    : t('stock.no_expiring', { days })}
                </td>
              </tr>
            ) : (
              data?.data.map((lot) => {
                const expired = lot.days_remaining < 0
                const urgent  = lot.days_remaining <= 7
                return (
                  <tr key={`${lot.product_id}-${lot.lot_number}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{lot.product_name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{lot.variant_summary ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{lot.lot_number}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatDate(lot.expiry_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={expired || urgent ? 'danger' : 'warning'}>
                        {expired ? t('stock.expired') : lot.days_remaining === 0 ? t('stock.today') : `${lot.days_remaining} j`}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                      {lot.quantity_remaining}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Vue carte (mobile) ───────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))
        ) : data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            {debouncedSearch
              ? t('stock.no_expiring_search', { search: debouncedSearch, days })
              : t('stock.no_expiring', { days })}
          </p>
        ) : (
          data?.data.map((lot) => {
            const expired = lot.days_remaining < 0
            const urgent  = lot.days_remaining <= 7
            return (
              <div key={`${lot.product_id}-${lot.lot_number}`} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{lot.product_name}</p>
                    {lot.variant_summary && <p className="text-xs text-gray-400 dark:text-gray-500">{lot.variant_summary}</p>}
                  </div>
                  <Badge variant={expired || urgent ? 'danger' : 'warning'}>
                    {expired ? t('stock.expired') : lot.days_remaining === 0 ? t('stock.today') : `${lot.days_remaining} j`}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{t('stock.lot_prefix')} <span className="font-mono text-gray-700 dark:text-gray-300">{lot.lot_number}</span> · expire le {formatDate(lot.expiry_date)}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{lot.quantity_remaining}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {data && data.last_page > 1 && (
        <Pagination
          currentPage={data.current_page}
          lastPage={data.last_page}
          total={data.total}
          perPage={data.per_page}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

// ── InventaireTab ─────────────────────────────────────────────────────────

function InventaireTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<InventorySession | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-sessions', page],
    queryFn: () => getInventorySessions({ page }),
    placeholderData: (prev) => prev,
  })

  const createMutation = useMutation({
    mutationFn: () => createInventorySession(notes || undefined),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['inventory-sessions'] })
      setNewOpen(false)
      setNotes('')
      navigate(`/stock/inventory/${session.uid}`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => deleteInventorySession(uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-sessions'] })
      setDeleteTarget(null)
      toast.success(t('stock.inventory_deleted'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('stock.inventory_desc')}
        </p>
        <CanDo permission="stock.adjust">
          <Button
            type="button"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setNewOpen(true)}
          >
            {t('stock.new_inventory')}
          </Button>
        </CanDo>
      </div>

      {/* ── Vue tableau (sm+) ── */}
      <div className="hidden sm:block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {[t('common.reference'), t('common.date'), t('stock.created_by'), t('products.title'), t('common.status'), ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  {t('stock.no_inventory')}
                </td>
              </tr>
            ) : (
              data?.data.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition"
                  onClick={() => navigate(`/stock/inventory/${s.uid}`)}
                >
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{s.reference}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.creator?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.items_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.status === 'confirmed' ? 'success' : 'warning'}>
                      {s.status === 'confirmed' ? t('stock.confirmed') : t('purchases.draft')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === 'draft' && (
                      <CanDo permission="stock.adjust">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(s) }}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </CanDo>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Vue carte (mobile) ── */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))
        ) : data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">{t('stock.no_inventory_short')}</p>
        ) : (
          data?.data.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/stock/inventory/${s.uid}`)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 active:bg-gray-50 dark:active:bg-gray-700/40 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{s.reference}</span>
                <Badge variant={s.status === 'confirmed' ? 'success' : 'warning'}>
                  {s.status === 'confirmed' ? t('stock.confirmed') : t('purchases.draft')}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(s.created_at)} · {s.items_count ?? 0} produit{(s.items_count ?? 0) > 1 ? 's' : ''}</p>
            </div>
          ))
        )}
      </div>

      {data && data.last_page > 1 && (
        <Pagination currentPage={data.current_page} lastPage={data.last_page} total={data.total} perPage={data.per_page} onPageChange={setPage} />
      )}

      {/* Modal nouvel inventaire */}
      <Modal
        isOpen={newOpen}
        onClose={() => setNewOpen(false)}
        title={t('stock.new_inventory')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setNewOpen(false)}>{t('common.cancel')}</Button>
            <Button
              icon={<ClipboardDocumentListIcon className="h-4 w-4" />}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('stock.new_inventory_desc')}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('stock.notes_optional')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t('stock.notes_placeholder')}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 px-3 py-2 text-sm outline-none focus:border-brand-primary resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Modal suppression */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('stock.delete_inventory_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.uid)}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('stock.delete_inventory_confirm')} <strong className="dark:text-gray-200">{deleteTarget?.reference}</strong> ? {t('stock.delete_inventory_no_adjust')}
        </p>
      </Modal>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function StockPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>(
    location.state?.tab === 'inventaire' ? 'inventaire' : 'movements',
  )
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [prefill, setPrefill] = useState<StockAdjustPrefill | null>(null)

  const openAdjust = (p?: StockAdjustPrefill) => {
    setPrefill(p ?? null)
    setAdjustOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('stock.title')}</h1>
        <CanDo permission="stock.adjust">
          <Button onClick={() => openAdjust()} icon={<PlusIcon className="h-4 w-4" />}>
            {t('stock.adjust')}
          </Button>
        </CanDo>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6 -mb-px">
          {(['movements', 'alerts', 'expiring', 'inventaire'] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setTab(tabKey)}
              className={[
                'pb-3 text-sm font-medium border-b-2 transition',
                tab === tabKey
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
              ].join(' ')}
            >
              {t(`stock.tab_${tabKey === 'inventaire' ? 'inventory' : tabKey}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'movements'  && <MovementsTab />}
      {tab === 'alerts'     && <AlertsTab onAdjust={(p) => openAdjust(p)} />}
      {tab === 'expiring'   && <ExpiringTab />}
      {tab === 'inventaire' && <InventaireTab />}

      <StockAdjustModal
        isOpen={adjustOpen}
        prefill={prefill}
        onClose={() => { setAdjustOpen(false); setPrefill(null) }}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['stock'] })}
      />
    </div>
  )
}
