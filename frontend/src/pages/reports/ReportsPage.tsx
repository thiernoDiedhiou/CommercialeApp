import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  const brandColor = useBrandColor()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-7 w-32" />
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <Skeleton className="h-52 w-full" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { summary, chart } = data

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Chiffre d'affaires"
          value={formatCurrency(summary.revenue)}
          icon={<BanknotesIcon className="h-5 w-5" />}
        />
        <KpiCard
          title="Nombre de ventes"
          value={summary.sales_count.toLocaleString('fr-SN')}
          icon={<ShoppingCartIcon className="h-5 w-5" />}
        />
        <KpiCard
          title="Bénéfice"
          value={formatCurrency(summary.profit)}
          icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
        />
        <KpiCard
          title="Panier moyen"
          value={formatCurrency(summary.average_basket)}
          icon={<ArchiveBoxIcon className="h-5 w-5" />}
        />
      </div>

      {/* Graphique CA */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Évolution du chiffre d'affaires</h2>
        {chart.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Aucune donnée pour cette période.</p>
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
  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  if (!data?.data.length) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        <p className="text-sm text-gray-400">Aucune vente sur cette période.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-3 w-8 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 text-right font-medium">Qté vendue</th>
              <th className="px-4 py-3 text-right font-medium">CA (FCFA)</th>
              <th className="px-4 py-3 text-right font-medium">Bénéfice (FCFA)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.data.map((row, idx) => (
              <tr key={row.product_id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                <td className="px-4 py-3 text-gray-500">{row.category ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {parseFloat(String(row.qty_sold)).toLocaleString('fr-SN')}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {formatCurrency(row.revenue)}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(row.profit)}
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
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-7 w-20" />
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-3">
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
          title="Total entrées"
          value={summary.total_in.toLocaleString('fr-SN')}
          icon={<ArrowUpIcon className="h-5 w-5" />}
        />
        <KpiCard
          title="Total sorties"
          value={summary.total_out.toLocaleString('fr-SN')}
          icon={<ArrowDownIcon className="h-5 w-5" />}
        />
        <KpiCard
          title="Retours"
          value={summary.total_return.toLocaleString('fr-SN')}
          icon={<ArchiveBoxIcon className="h-5 w-5" />}
        />
        <KpiCard
          title="Ajustements"
          value={summary.total_adjustment.toLocaleString('fr-SN')}
          icon={<ArchiveBoxIcon className="h-5 w-5" />}
        />
      </div>

      {/* Table */}
      {data.data.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-400">Aucun mouvement de stock sur cette période.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Produit</th>
                  <th className="px-4 py-3 text-right font-medium">Entrées</th>
                  <th className="px-4 py-3 text-right font-medium">Sorties</th>
                  <th className="px-4 py-3 text-right font-medium">Retours</th>
                  <th className="px-4 py-3 text-right font-medium">Ajustements</th>
                  <th className="px-4 py-3 text-right font-medium">Stock actuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.data.map((row) => (
                  <tr key={row.product_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
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
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {row.current_stock.toLocaleString('fr-SN')}
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

const TAB_LABELS: Record<Tab, string> = {
  sales:    'Ventes',
  products: 'Produits',
  stock:    'Stock',
}

export default function ReportsPage() {
  const [tab, setTab]         = useState<Tab>('sales')
  const [from, setFrom]       = useState(startOfMonth)
  const [to, setTo]           = useState(today)
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day')
  const [exporting, setExporting] = useState(false)

  const salesQuery = useQuery({
    queryKey: ['report-sales', from, to, groupBy],
    queryFn:  () => getSalesReport({ from, to, group_by: groupBy }),
    enabled:  tab === 'sales',
    staleTime: 60_000,
  })

  const productsQuery = useQuery({
    queryKey: ['report-products', from, to],
    queryFn:  () => getProductsReport({ from, to }),
    enabled:  tab === 'products',
    staleTime: 60_000,
  })

  const stockQuery = useQuery({
    queryKey: ['report-stock', from, to],
    queryFn:  () => getStockReport({ from, to }),
    enabled:  tab === 'stock',
    staleTime: 60_000,
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      if (tab === 'sales')    await exportSalesCsv({ from, to, group_by: groupBy })
      if (tab === 'products') await exportProductsCsv({ from, to })
      if (tab === 'stock')    await exportStockCsv({ from, to })
    } catch {
      alert("Une erreur est survenue lors de l'export. Veuillez réessayer.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Rapports</h1>
        <Button
          variant="outline"
          icon={<ArrowDownTrayIcon className="h-4 w-4" />}
          loading={exporting}
          onClick={handleExport}
        >
          Exporter CSV
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Input
            label="Du"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Input
            label="Au"
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
              <option value="day">Par jour</option>
              <option value="month">Par mois</option>
            </Select>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[t]}
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
