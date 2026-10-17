import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Receipt, TrendingUp, Banknote, Wallet } from 'lucide-react'
import { ChartBarIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { getDashboardSummary } from '@/services/api/dashboard'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton'
import KpiCard from '@/components/dashboard/KpiCard'
import WeekChart from '@/components/dashboard/WeekChart'
import StockAlertList from '@/components/dashboard/StockAlertList'
import RecentSalesList from '@/components/dashboard/RecentSalesList'
import { formatCurrency } from '@/lib/utils'

const STALE_TIME       = 60_000
const REFETCH_INTERVAL = 60_000

export default function DashboardPage() {
  const { t } = useTranslation()
  const subscriptionExpired = useAuthStore((s) => s.subscriptionExpired)

  const { data, isLoading } = useQuery({
    queryKey        : ['dashboard-summary'],
    queryFn         : getDashboardSummary,
    staleTime       : STALE_TIME,
    refetchInterval : subscriptionExpired ? false : REFETCH_INTERVAL,
    enabled         : !subscriptionExpired,
    retry           : false,
  })

  const locked         = subscriptionExpired && !data
  const today          = data?.today
  const profit         = today ? Number(today.profit) : 0
  const todayCollected = Object.values(data?.by_payment_method ?? {}).reduce((s, v) => s + v, 0)

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard.title')} />

      {/* Zone 1 — KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard
              title={t('dashboard.sales_today')}
              value={locked ? '—' : (today?.sales_count ?? 0)}
              subtitle={t('dashboard.all_channels')}
              color="blue"
              icon={<Receipt className="h-5 w-5" />}
            >
              {!locked && (today?.shop_orders_count ?? 0) > 0 && (
                <ul className="space-y-1">
                  <li className="flex justify-between text-xs text-gray-500">
                    <span>{t('dashboard.pos')}</span>
                    <span>{today?.pos_sales_count ?? 0}</span>
                  </li>
                  <li className="flex justify-between text-xs text-gray-500">
                    <span>{t('dashboard.online_shop')}</span>
                    <span>{today?.shop_orders_count ?? 0}</span>
                  </li>
                </ul>
              )}
            </KpiCard>

            <KpiCard
              title={t('dashboard.revenue_today')}
              value={locked ? '—' : formatCurrency(today?.revenue ?? 0)}
              subtitle={t('dashboard.all_channels')}
              color="green"
              icon={<Banknote className="h-5 w-5" />}
            >
              {!locked && (today?.shop_orders_revenue ?? 0) > 0 && (
                <ul className="space-y-1">
                  <li className="flex justify-between text-xs text-gray-500">
                    <span>{t('dashboard.pos')}</span>
                    <span>{formatCurrency(today?.pos_revenue ?? 0)}</span>
                  </li>
                  <li className="flex justify-between text-xs text-gray-500">
                    <span>{t('dashboard.online_shop')}</span>
                    <span>{formatCurrency(today?.shop_orders_revenue ?? 0)}</span>
                  </li>
                </ul>
              )}
            </KpiCard>

            <KpiCard
              title={t('dashboard.profit')}
              value={locked ? '—' : formatCurrency(Math.abs(profit))}
              subtitle={locked ? '' : (profit >= 0 ? t('dashboard.profit_positive') : t('dashboard.profit_negative'))}
              trend={locked ? undefined : (profit >= 0 ? 'up' : 'down')}
              color="purple"
              icon={<TrendingUp className="h-5 w-5" />}
            />

            <KpiCard
              title={t('dashboard.collected_day')}
              value={locked ? '—' : formatCurrency(todayCollected)}
              subtitle={t('dashboard.pos')}
              color="amber"
              icon={<Wallet className="h-5 w-5" />}
            >
              {!locked && data?.by_payment_method && Object.keys(data.by_payment_method).length > 0 && (
                <ul className="space-y-1">
                  {Object.entries(data.by_payment_method).map(([method, amount]) => (
                    <li key={method} className="flex justify-between text-xs text-gray-500">
                      <span className="capitalize">{method.replace('_', ' ')}</span>
                      <span>{formatCurrency(amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </KpiCard>
          </>
        )}
      </div>

      {/* Zone 2 — Graphique semaine + Top produits */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">{t('dashboard.week_chart')}</h2>
          {isLoading ? (
            <div className="h-[220px] animate-pulse rounded-lg bg-gray-100" />
          ) : (data?.week_chart ?? []).length === 0 ? (
            <div className="flex h-[160px] flex-col items-center justify-center text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <PresentationChartLineIcon className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">{t('dashboard.no_sales_week')}</p>
              <p className="mt-1 text-xs text-slate-400">{t('dashboard.no_sales_week_desc')}</p>
            </div>
          ) : (
            <WeekChart data={data!.week_chart} />
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">{t('dashboard.top_products')}</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : (data?.top_products ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <ChartBarIcon className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">{t('dashboard.no_sales_today')}</p>
              <p className="mt-1 text-xs text-slate-400">{t('dashboard.top_products_desc')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {(data?.top_products ?? []).map((p, idx) => (
                <li key={p.product_id}>
                  <Link
                    to={`/products/${p.product_uid}`}
                    className="flex items-center justify-between py-2 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                        {idx + 1}
                      </span>
                      <p className="truncate text-sm text-gray-800">{p.product_name}</p>
                    </div>
                    <div className="ml-2 shrink-0 text-right">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(p.revenue)}</p>
                      <p className="text-xs text-gray-400">{p.quantity_sold} {t('dashboard.unit_sold')}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Zone 3 — Alertes stock + Ventes récentes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <StockAlertList
            alerts={data?.stock_alerts ?? []}
            expiring={data?.expiring_soon ?? []}
            loading={isLoading}
          />
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">{t('dashboard.recent_sales_section')}</h2>
          <RecentSalesList sales={data?.recent_sales ?? []} loading={isLoading} />
        </div>
      </div>
    </div>
  )
}
