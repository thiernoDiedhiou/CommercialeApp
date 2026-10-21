import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  ArrowRightIcon,
  UserGroupIcon,
  ClockIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { getDebts } from '@/services/api/customers'
import { SkeletonRow } from '@/components/ui/Skeleton'
import Pagination from '@/components/ui/Pagination'
import { formatCurrency } from '@/lib/utils'

type SortKey = 'amount_desc' | 'amount_asc' | 'oldest_first' | 'name_asc'

function debtAgeDays(dateStr: string | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function AgeBadge({ days }: { days: number }) {
  if (days <= 7)
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">≤ 7 j</span>
  if (days <= 30)
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{days} j</span>
  if (days <= 60)
    return <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">{days} j</span>
  return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">{days} j ⚠</span>
}

export default function DebtsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort]     = useState<SortKey>('amount_desc')
  const [page, setPage]     = useState(1)

  const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'amount_desc',  label: t('customers.sort_amount_desc') },
    { value: 'amount_asc',   label: t('customers.sort_amount_asc') },
    { value: 'oldest_first', label: t('customers.sort_oldest') },
    { value: 'name_asc',     label: t('customers.sort_name_asc') },
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['debts', { search, sort, page }],
    queryFn: () => getDebts({ search: search || undefined, sort, page }),
  })

  const rows            = data?.data ?? []
  const totalDebt       = data?.global_outstanding ?? 0
  const totalClients    = data?.total ?? 0

  // Plus ancienne créance toutes pages confondues
  const oldestDays = rows.reduce((max, r) => {
    const d = debtAgeDays(r.oldest_debt_date)
    return d > max ? d : max
  }, 0)

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ExclamationCircleIcon className="h-6 w-6 text-red-400" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">{t('customers.debts_title')}</h1>
        </div>
      </div>

      {/* KPIs */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50">
              <BanknotesIcon className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('customers.total_due')}</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
            </div>
          </div>
          <div className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50">
              <UserGroupIcon className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('customers.debtor_clients')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalClients}</p>
            </div>
          </div>
          <div className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50">
              <ClockIcon className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('customers.oldest_debt_age')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {oldestDays > 0 ? `${oldestDays} j` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder={t('customers.debt_search_placeholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <div className="relative">
          <ChevronUpDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortKey); setPage(1) }}
            className="appearance-none rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 overflow-hidden">

        {/* ── Cartes mobiles ── */}
        <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700/60">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3"><SkeletonRow /></div>
              ))
            : rows.length === 0
            ? (
              <div className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                    <BanknotesIcon className="h-7 w-7 text-green-400" />
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">{t('customers.debt_empty_title')}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">{t('customers.up_to_date')}</p>
                </div>
              </div>
            )
            : rows.map((row) => {
                const days = debtAgeDays(row.oldest_debt_date)
                return (
                  <button
                    key={row.uid}
                    type="button"
                    onClick={() => navigate(`/debts/${row.uid}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold select-none ${
                      days > 60 ? 'bg-red-100 text-red-600' :
                      days > 30 ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {row.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{row.name}</p>
                        <span className={`shrink-0 font-bold text-sm ${days > 60 ? 'text-red-600' : days > 30 ? 'text-orange-600' : 'text-red-500'}`}>
                          {formatCurrency(row.outstanding_balance)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                        {row.phone && <span>{row.phone}</span>}
                        <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                          {row.unpaid_sales_count} {t('customers.unpaid_suffix')}
                        </span>
                        {row.oldest_debt_date && <AgeBadge days={days} />}
                      </div>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-gray-300" />
                  </button>
                )
              })
          }
        </div>

        {/* ── Tableau desktop ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('customers.title')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('common.phone')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('customers.unpaid_sales')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('customers.age_label')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('customers.balance_due')}</th>
                <th className="sr-only">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-3"><SkeletonRow /></td>
                    </tr>
                  ))
                : rows.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                          <BanknotesIcon className="h-7 w-7 text-green-400" />
                        </div>
                        <p className="font-medium text-gray-700 dark:text-gray-300">{t('customers.debt_empty_title')}</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">{t('customers.up_to_date')}</p>
                      </div>
                    </td>
                  </tr>
                )
                : rows.map((row) => {
                    const days = debtAgeDays(row.oldest_debt_date)
                    const rowColor = days > 60 ? 'hover:bg-red-50 dark:hover:bg-red-900/20' : days > 30 ? 'hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                    return (
                      <tr
                        key={row.uid}
                        className={`cursor-pointer transition-colors ${rowColor}`}
                        onClick={() => navigate(`/debts/${row.uid}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold select-none ${
                              days > 60 ? 'bg-red-100 text-red-600' : days > 30 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {row.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{row.name}</p>
                              {row.email && <p className="text-xs text-gray-400 dark:text-gray-500">{row.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                            {row.unpaid_sales_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.oldest_debt_date ? <AgeBadge days={days} /> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${days > 60 ? 'text-red-600' : days > 30 ? 'text-orange-600' : 'text-red-500'}`}>
                            {formatCurrency(row.outstanding_balance)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ArrowRightIcon className="h-4 w-4 text-gray-300" />
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>

        {data && data.last_page > 1 && (
          <div className="border-t border-gray-100 dark:border-gray-700/60 px-4 py-3">
            <Pagination
              currentPage={data.current_page}
              lastPage={data.last_page}
              total={data.total}
              perPage={data.per_page}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Légende ancienneté */}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">{t('customers.age_legend')}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">≤ 7 j</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">8 – 30 j</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-700">31 – 60 j</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">{'> 60 j ⚠'}</span>
        </div>
      )}
    </div>
  )
}
