import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { MagnifyingGlassIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { getReturns } from '@/services/api/sales'
import Badge from '@/components/ui/Badge'
import { SkeletonRow } from '@/components/ui/Skeleton'
import Pagination from '@/components/ui/Pagination'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { RefundMethod } from '@/types'
import EmptyState from '@/components/ui/EmptyState'

const REFUND_BADGE: Record<RefundMethod, 'success' | 'info' | 'default'> = {
  cash:   'success',
  credit: 'info',
  none:   'default',
}

export default function ReturnsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refundFilter, setRefundFilter] = useState('')

  const REFUND_LABELS: Record<RefundMethod, string> = {
    cash:   t('returns.refund_cash'),
    credit: t('returns.refund_credit'),
    none:   t('returns.refund_none'),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['returns', { search, page, refundFilter }],
    queryFn: () => getReturns({ search: search || undefined, page, refund_method: refundFilter || undefined }),
  })

  const returns = data?.data ?? []

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">{t('returns.title')}</h1>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder={t('returns.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <select
          aria-label="Filtrer par type de remboursement"
          value={refundFilter}
          onChange={(e) => { setRefundFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <option value="">{t('returns.filter_all')}</option>
          <option value="cash">{t('returns.refund_cash')}</option>
          <option value="credit">{t('returns.refund_credit')}</option>
          <option value="none">{t('returns.refund_none')}</option>
        </select>
      </div>

      {/* ── Vue carte (mobile) ───────────────────────────────────────────── */}
      <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700/60 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))
        ) : returns.length === 0 ? (
          <EmptyState icon={<ArrowUturnLeftIcon className="h-7 w-7" />} title={t('returns.empty_title')} description={t('returns.empty_desc')} />
        ) : (
          returns.map((ret) => (
            <div key={ret.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{ret.reference}</span>
                <Badge variant={REFUND_BADGE[ret.refund_method]}>{REFUND_LABELS[ret.refund_method]}</Badge>
              </div>
              <div className="flex items-center justify-between mb-1">
                {ret.sale ? (
                  <Link
                    to={`/sales/${ret.sale.uid}`}
                    className="font-mono text-sm text-brand-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ret.sale.reference}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
                <span className="text-xs text-gray-400">{ret.items_count ?? '—'} {t('returns.items')}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{formatDateTime(ret.created_at)}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(ret.total)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Vue tableau (desktop) ────────────────────────────────────────── */}
      <div className="hidden sm:block rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('returns.reference')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('returns.original_sale')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('returns.date')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('returns.items')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('returns.refund_method')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('returns.total_refund')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonRow key={i} cols={6} />
                  ))
                : returns.length === 0
                ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={<ArrowUturnLeftIcon className="h-7 w-7" />} title={t('returns.empty_title')} description={t('returns.empty_desc')} />
                    </td>
                  </tr>
                )
                : returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {ret.reference}
                    </td>
                    <td className="px-4 py-3">
                      {ret.sale ? (
                        <Link
                          to={`/sales/${ret.sale.uid}`}
                          className="font-mono text-brand-primary hover:underline"
                        >
                          {ret.sale.reference}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDateTime(ret.created_at)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {ret.items_count ?? '—'} {t('returns.items')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={REFUND_BADGE[ret.refund_method]}>
                        {REFUND_LABELS[ret.refund_method]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(ret.total)}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

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
