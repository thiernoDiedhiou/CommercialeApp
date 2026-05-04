import { useQuery } from '@tanstack/react-query'
import {
  BanknotesIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { getDashboardSummary } from '@/services/api/dashboard'
import { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'
import KpiCard from '@/components/dashboard/KpiCard'
import WeekChart from '@/components/dashboard/WeekChart'
import StockAlertList from '@/components/dashboard/StockAlertList'
import RecentSalesList from '@/components/dashboard/RecentSalesList'
import { formatCurrency } from '@/lib/utils'

const REFETCH_INTERVAL = 5 * 60 * 1000

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    staleTime: REFETCH_INTERVAL,
    refetchInterval: REFETCH_INTERVAL,
  })

  const today = data?.today
  const profit = today ? Number(today.profit) : 0

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>

      {/* Zone 1 — KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard
              title="Ventes du jour"
              value={today?.sales_count ?? 0}
              subtitle="commandes"
              icon={<ShoppingCartIcon className="h-5 w-5" />}
            />

            <KpiCard
              title="Chiffre d'affaires"
              value={formatCurrency(today?.revenue ?? 0)}
              icon={<BanknotesIcon className="h-5 w-5" />}
            />

            <KpiCard
              title="Bénéfice"
              value={formatCurrency(Math.abs(profit))}
              subtitle={profit >= 0 ? '▲ positif' : '▼ négatif'}
              trend={profit >= 0 ? 'up' : 'down'}
              icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
            />

            <KpiCard
              title="Paiements en attente"
              value={formatCurrency(today?.pending_amount ?? 0)}
              icon={<ClockIcon className="h-5 w-5" />}
            >
              {data && Object.keys(data.by_payment_method).length > 0 && (
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
          <h2 className="mb-4 text-sm font-semibold text-gray-700">CA des 7 derniers jours</h2>
          {isLoading ? (
            <div className="h-[220px] animate-pulse rounded-lg bg-gray-100" />
          ) : (
            <WeekChart data={data?.week_chart ?? []} />
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Top 5 produits</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {(data?.top_products ?? []).map((p, idx) => (
                <li key={p.product_id} className="flex items-center justify-between py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                      {idx + 1}
                    </span>
                    <p className="truncate text-sm text-gray-800">{p.product_name}</p>
                  </div>
                  <div className="ml-2 shrink-0 text-right">
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(p.revenue)}</p>
                    <p className="text-xs text-gray-400">{p.quantity_sold} u.</p>
                  </div>
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
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Ventes récentes</h2>
          <RecentSalesList sales={data?.recent_sales ?? []} loading={isLoading} />
        </div>
      </div>
    </div>
  )
}
