import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  ArchiveBoxIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PresentationChartLineIcon,
  ChartBarIcon,
  CubeIcon,
} from '@heroicons/react/24/outline'
import {
  getSalesReport, exportSalesCsv,
  getProductsReport, exportProductsCsv,
  getStockReport, exportStockCsv,
} from '@/services/api/reports'
import KpiCard from '@/components/dashboard/KpiCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import type { SalesReport, ProductsReport, StockReport } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────

function startOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function useBrandColor(): string {
  const [color, setColor] = useState('rgb(99,102,241)')
  useEffect(() => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-primary').trim()
    if (raw) setColor(`rgb(${raw})`)
  }, [])
  return color
}

const yFmt = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k`
  : String(v)

// ── Onglet Ventes ─────────────────────────────────────────────────────────

function SalesTab({ data, isLoading }: { data?: SalesReport; isLoading: boolean }) {
  const { t } = useTranslation()
  const brandColor = useBrandColor()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-7 w-32" />
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <Skeleton className="h-52 w-full" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-700">
          <PresentationChartLineIcon className="h-7 w-7 text-slate-400 dark:text-gray-500" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('reports.no_data_period')}</p>
        <p className="mt-1.5 max-w-xs text-xs text-slate-400 dark:text-gray-500 leading-relaxed">
          {t('reports.no_data_desc')}
        </p>
      </div>
    )
  }

  const { summary, chart } = data

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title={t('reports.kpi_revenue')}
          value={formatCurrency(summary.revenue)}
          icon={<BanknotesIcon className="h-5 w-5" />}
        />
        <KpiCard
          title={t('reports.kpi_sales_count')}
          value={summary.sales_count.toLocaleString('fr-SN')}
          icon={<ShoppingCartIcon className="h-5 w-5" />}
        />
        <KpiCard
          title={t('reports.kpi_profit')}
          value={formatCurrency(summary.profit)}
          icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
        />
        <KpiCard
          title={t('reports.kpi_avg_basket')}
          value={formatCurrency(summary.average_basket)}
          icon={<ArchiveBoxIcon className="h-5 w-5" />}
        />
      </div>

      {/* Graphique CA */}
      <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('reports.revenue_chart')}</h2>
        {chart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-700">
              <ChartBarIcon className="h-7 w-7 text-slate-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('reports.no_sales_chart')}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">{t('reports.no_sales_chart_desc')}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yFmt}
                width={52}
              />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'CA']}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.12)' }}
              />
              <Bar dataKey="revenue" fill={brandColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

// ── Onglet Produits ───────────────────────────────────────────────────────

function ProductsTab({ data, isLoading }: { data?: ProductsReport; isLoading: boolean }) {
  const { t } = useTranslation()
  if (isLoading) {
    return (
      <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  if (!data?.data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-700">
          <ShoppingCartIcon className="h-7 w-7 text-slate-400 dark:text-gray-500" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('reports.no_sales_products')}</p>
        <p className="mt-1.5 max-w-xs text-xs text-slate-400 dark:text-gray-500 leading-relaxed">{t('reports.no_sales_products_desc')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700/60 text-left text-xs text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 w-8 font-medium">#</th>
              <th className="px-4 py-3 font-medium">{t('common.product')}</th>
              <th className="px-4 py-3 font-medium">{t('products.category')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('reports.col_qty_sold')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('reports.col_revenue')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('reports.col_profit')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('reports.col_margin')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {data.data.map((row, idx) => (
              <tr key={row.product_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40">
                <td className="px-4 py-3 text-gray-400 dark:text-gray-500">{idx + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.category ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  {parseFloat(String(row.qty_sold)).toLocaleString('fr-SN')}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(row.revenue)}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(row.profit)}
                </td>
                <td className={`px-4 py-3 text-right font-medium text-xs ${row.margin_rate >= 20 ? 'text-emerald-600' : row.margin_rate >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
                  {row.margin_rate.toFixed(1)} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Onglet Stock ──────────────────────────────────────────────────────────

function StockTab({ data, isLoading }: { data?: StockReport; isLoading: boolean }) {
  const { t } = useTranslation()
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-7 w-20" />
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { summary } = data

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title={t('reports.kpi_total_in')}
          value={summary.total_in.toLocaleString('fr-SN')}
          icon={<ArrowUpIcon className="h-5 w-5" />}
        />
        <KpiCard
          title={t('reports.kpi_total_out')}
          value={summary.total_out.toLocaleString('fr-SN')}
          icon={<ArrowDownIcon className="h-5 w-5" />}
        />
        <KpiCard
          title={t('reports.kpi_returns')}
          value={summary.total_return.toLocaleString('fr-SN')}
          icon={<ArchiveBoxIcon className="h-5 w-5" />}
        />
        <KpiCard
          title={t('reports.kpi_adjustments')}
          value={summary.total_adjustment.toLocaleString('fr-SN')}
          icon={<ArchiveBoxIcon className="h-5 w-5" />}
        />
        <KpiCard
          title={t('reports.kpi_stock_value')}
          value={formatCurrency(summary.total_stock_value)}
          icon={<BanknotesIcon className="h-5 w-5" />}
          accent="secondary"
          className="col-span-2 lg:col-span-4"
        />
      </div>

      {/* Table */}
      {data.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-700">
            <CubeIcon className="h-7 w-7 text-slate-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('reports.no_stock_movements')}</p>
          <p className="mt-1.5 max-w-xs text-xs text-slate-400 dark:text-gray-500 leading-relaxed">{t('reports.no_stock_movements_desc')}</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/60 text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">{t('common.product')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('reports.stock_col_in')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('reports.stock_col_out')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('reports.stock_col_returns')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('reports.stock_col_adj')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('reports.stock_col_current')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('reports.stock_col_value')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                {data.data.map((row) => (
                  <tr key={row.product_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                      {row.total_in > 0 ? `+${row.total_in.toLocaleString('fr-SN')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500 font-medium">
                      {row.total_out > 0 ? row.total_out.toLocaleString('fr-SN') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 font-medium">
                      {row.total_return > 0 ? row.total_return.toLocaleString('fr-SN') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">
                      {row.total_adjustment > 0 ? row.total_adjustment.toLocaleString('fr-SN') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                      {row.current_stock.toLocaleString('fr-SN')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(row.stock_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────

type Tab = 'sales' | 'products' | 'stock'

export default function ReportsPage() {
  const { t } = useTranslation()
  const [tab, setTab]         = useState<Tab>('sales')
  const [from, setFrom]       = useState(startOfMonth)
  const [to, setTo]           = useState(today)
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day')
  const [limit, setLimit]     = useState(50)
  const [exporting, setExporting] = useState(false)

  const salesQuery = useQuery({
    queryKey: ['report-sales', from, to, groupBy],
    queryFn:  () => getSalesReport({ from, to, group_by: groupBy }),
    enabled:  tab === 'sales',
    staleTime: 60_000,
  })

  const productsQuery = useQuery({
    queryKey: ['report-products', from, to, limit],
    queryFn:  () => getProductsReport({ from, to, limit }),
    enabled:  tab === 'products',
    staleTime: 60_000,
  })

  const stockQuery = useQuery({
    queryKey: ['report-stock', from, to],
    queryFn:  () => getStockReport({ from, to }),
    enabled:  tab === 'stock',
    staleTime: 60_000,
  })

  const TAB_LABELS: Record<Tab, string> = {
    sales:    t('nav.sales'),
    products: t('nav.products'),
    stock:    t('nav.stock'),
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      if (tab === 'sales')    await exportSalesCsv({ from, to, group_by: groupBy })
      if (tab === 'products') await exportProductsCsv({ from, to, limit })
      if (tab === 'stock')    await exportStockCsv({ from, to })
    } catch {
      alert(t('reports.export_error'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">{t('reports.title')}</h1>
        <Button
          variant="outline"
          icon={<ArrowDownTrayIcon className="h-4 w-4" />}
          loading={exporting}
          onClick={handleExport}
        >
          {t('reports.export_csv')}
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Input
            label={t('reports.from_label')}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Input
            label={t('reports.to_label')}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        {tab === 'sales' && (
          <div className="w-36">
            <Select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'day' | 'month')}
            >
              <option value="day">{t('reports.group_by_day')}</option>
              <option value="month">{t('reports.group_by_month')}</option>
            </Select>
          </div>
        )}
        {tab === 'products' && (
          <div className="w-36">
            <Select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={200}>Top 200</option>
            </Select>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-700 p-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === tabKey
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {TAB_LABELS[tabKey]}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {tab === 'sales'    && <SalesTab    data={salesQuery.data}    isLoading={salesQuery.isLoading} />}
      {tab === 'products' && <ProductsTab data={productsQuery.data} isLoading={productsQuery.isLoading} />}
      {tab === 'stock'    && <StockTab    data={stockQuery.data}    isLoading={stockQuery.isLoading} />}
    </div>
  )
}
