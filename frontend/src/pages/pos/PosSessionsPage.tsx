import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, TrendingUp, ShoppingCart, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSessions } from '@/services/api/pos'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import type { PosSessionWithStats } from '@/types'

function duration(openedAt: string, closedAt: string | null): string {
  const start = new Date(openedAt).getTime()
  const end   = closedAt ? new Date(closedAt).getTime() : Date.now()
  const mins  = Math.floor((end - start) / 60_000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default function PosSessionsPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['pos-sessions', page],
    queryFn: () => getSessions(page),
  })

  const sessions = data?.data ?? []
  const lastPage = data?.last_page ?? 1
  const total    = data?.total ?? 0

  // KPIs résumés du jour (sessions de la page courante)
  const openSessions   = sessions.filter((s) => s.status === 'open').length
  const totalSales     = sessions.reduce((n, s) => n + s.sales_count, 0)
  const totalRevenue   = sessions.reduce((n, s) => n + Number(s.total_confirmed), 0)

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('pos.sessions_title')}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{t('pos.sessions_subtitle')}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">{t('pos.active_sessions')}</span>
          </div>
          <p className="text-2xl font-bold text-brand-primary">{openSessions}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <ShoppingCart className="h-4 w-4" />
            <span className="text-xs font-medium">{t('pos.sales_page')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalSales}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 col-span-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">{t('pos.total_collected_page')}</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="ml-auto h-4 w-20 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Wallet className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">{t('pos.no_sessions')}</p>
            <p className="text-xs mt-1">{t('pos.no_sessions_desc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">{t('pos.col_cashier')}</th>
                  <th className="px-4 py-3 font-medium">{t('pos.col_opened')}</th>
                  <th className="px-4 py-3 font-medium">{t('pos.col_closed')}</th>
                  <th className="px-4 py-3 font-medium">{t('pos.col_duration')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('pos.col_sales')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('pos.col_total')}</th>
                  <th className="px-4 py-3 font-medium">{t('pos.col_cash')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('pos.col_diff')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {lastPage > 1 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <Pagination
              currentPage={page}
              lastPage={lastPage}
              total={total}
              perPage={25}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function SessionRow({ session: s }: { session: PosSessionWithStats }) {
  const { t } = useTranslation()
  const isOpen = s.status === 'open'

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      {/* Caissier */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-brand-primary/10 flex items-center justify-center text-xs font-semibold text-brand-primary shrink-0">
            {s.user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <span className="font-medium text-gray-800">{s.user?.name ?? '—'}</span>
        </div>
      </td>

      {/* Ouverture */}
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
        {formatDateTime(s.opened_at)}
      </td>

      {/* Fermeture */}
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {s.closed_at ? formatDateTime(s.closed_at) : <span className="text-amber-500 font-medium">{t('pos.in_progress')}</span>}
      </td>

      {/* Durée */}
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {duration(s.opened_at, s.closed_at)}
      </td>

      {/* Ventes */}
      <td className="px-4 py-3 text-right">
        <span className="font-semibold text-gray-800">{s.sales_count}</span>
      </td>

      {/* Total */}
      <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
        {formatCurrency(Number(s.total_confirmed))}
      </td>

      {/* Mise / Clôture */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-gray-500">
            <span className="text-gray-400">{t('pos.opening_cash_label')} </span>
            {formatCurrency(Number(s.opening_cash))}
          </span>
          {s.closing_cash != null && (
            <span className="text-gray-500">
              <span className="text-gray-400">{t('pos.closing_cash_label')} </span>
              {formatCurrency(Number(s.closing_cash))}
            </span>
          )}
        </div>
      </td>

      {/* Écart caisse */}
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {s.cash_difference != null ? (
          <span className={`font-semibold text-sm ${
            Number(s.cash_difference) > 0
              ? 'text-emerald-600'
              : Number(s.cash_difference) < 0
                ? 'text-red-500'
                : 'text-gray-400'
          }`}>
            {Number(s.cash_difference) > 0 ? '+' : ''}
            {formatCurrency(Number(s.cash_difference))}
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>

      {/* Statut */}
      <td className="px-4 py-3">
        {isOpen
          ? <Badge variant="success">{t('pos.session_active')}</Badge>
          : <Badge variant="default">{t('pos.session_closed')}</Badge>
        }
      </td>
    </tr>
  )
}
