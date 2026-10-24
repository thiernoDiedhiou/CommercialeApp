import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCartIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  PresentationChartLineIcon,
  ArrowUpRightIcon,
  ExclamationCircleIcon,
  PlusIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'
import { getDashboardSummary, type DashboardParams } from '@/services/api/dashboard'
import { useAuthStore } from '@/store/authStore'
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton'
import WeekChart from '@/components/dashboard/WeekChart'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Badge from '@/components/ui/Badge'

const STALE_TIME       = 60_000
const REFETCH_INTERVAL = 60_000

type Period = 'today' | '7d' | 'month' | 'custom'

// Formate une date Y-m-d en dd/mm pour l'affichage compact
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  confirmed: 'success', draft: 'warning', cancelled: 'danger',
  preparing: 'info', shipped: 'info', delivered: 'success',
}
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmée', draft: 'Brouillon', cancelled: 'Annulée',
  preparing: 'En prép.', shipped: 'Expédiée', delivered: 'Livrée',
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const subscriptionExpired = useAuthStore((s) => s.subscriptionExpired)
  const activeBranch        = useAuthStore((s) => s.activeBranch)

  // ── Filtre période ────────────────────────────────────────────────────
  const [period,     setPeriod]     = useState<Period>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [chartDays,  setChartDays]  = useState<7 | 30 | 90>(7)
  const filterRef = useRef<HTMLDivElement>(null)

  // Ferme le dropdown si clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Calcul des bornes Y-m-d + chart_days envoyés au backend
  const apiParams = useMemo((): DashboardParams => {
    const today = new Date()
    const fmt   = (d: Date) => d.toISOString().slice(0, 10)
    if (period === 'today') {
      const s = fmt(today)
      return { date_from: s, date_to: s, chart_days: chartDays }
    }
    if (period === '7d') {
      const from = new Date(today); from.setDate(today.getDate() - 6)
      return { date_from: fmt(from), date_to: fmt(today), chart_days: chartDays }
    }
    if (period === 'month') {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      return { date_from: fmt(from), date_to: fmt(today), chart_days: chartDays }
    }
    // custom
    if (customFrom && customTo) return { date_from: customFrom, date_to: customTo, chart_days: chartDays }
    return { chart_days: chartDays }
  }, [period, customFrom, customTo, chartDays])

  // Label affiché dans le bouton filtre
  const periodLabel = useMemo(() => {
    if (period === 'today')  return t('dashboard.filter_today')
    if (period === '7d')     return t('dashboard.filter_7days')
    if (period === 'month')  return t('dashboard.filter_month')
    if (customFrom && customTo) return `${fmtDate(customFrom)} — ${fmtDate(customTo)}`
    return t('dashboard.filter_custom')
  }, [period, customFrom, customTo, t])

  const { data, isLoading } = useQuery({
    queryKey        : ['dashboard-summary', apiParams],
    queryFn         : () => getDashboardSummary(apiParams),
    staleTime       : STALE_TIME,
    refetchInterval : subscriptionExpired ? false : REFETCH_INTERVAL,
    enabled         : !subscriptionExpired,
    retry           : false,
  })

  const locked         = subscriptionExpired && !data
  const today          = data?.today
  const profit         = today ? Number(today.profit) : 0
  const todayCollected = Object.values(data?.by_payment_method ?? {}).reduce((s, v) => s + v, 0)
  const revenue        = today ? Number(today.revenue) : 0
  const collectedPct   = revenue > 0 ? Math.round((todayCollected / revenue) * 100) : 0
  const marginPct      = revenue > 0 ? Math.round((Math.abs(profit) / revenue) * 100) : 0
  const alertCount     = (data?.stock_alerts ?? []).length
  const recentSales    = data?.recent_sales ?? []

  // Label de canal contextuel : succursale active ou "tous canaux"
  const channelLabel = activeBranch ? activeBranch.name : t('dashboard.all_channels')

  return (
    <div className="space-y-6">

      {/* ── En-tête + filtre période ────────────────────────────────────── */}
      <section className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-gray-100">
            {t('dashboard.title')}
          </h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-gray-400 hidden sm:block">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Dropdown filtre période */}
        <div ref={filterRef} className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 shadow-sm transition hover:border-brand-primary focus:outline-none"
          >
            <CalendarDaysIcon className="h-4 w-4 text-slate-400 dark:text-gray-500 shrink-0" />
            <span>{periodLabel}</span>
            <ChevronDownIcon className={`h-3.5 w-3.5 text-slate-400 dark:text-gray-500 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full z-30 mt-1.5 w-64 sm:w-72 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-xl">
              {/* Presets */}
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                {t('dashboard.period')}
              </p>
              <div className="mb-3 flex gap-1.5">
                {(['today', '7d', 'month'] as const).map((key) => {
                  const labels: Record<string, string> = {
                    today: t('dashboard.filter_today'),
                    '7d':  t('dashboard.filter_7days'),
                    month: t('dashboard.filter_month'),
                  }
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setPeriod(key); setFilterOpen(false) }}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                        period === key
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {labels[key]}
                    </button>
                  )
                })}
              </div>

              {/* Séparateur */}
              <div className="mb-3 border-t border-slate-100 dark:border-gray-700/60" />

              {/* Plage personnalisée */}
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                {t('dashboard.filter_custom')}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 px-2 py-1.5 text-xs text-slate-700 dark:text-gray-200 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500">→</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 px-2 py-1.5 text-xs text-slate-700 dark:text-gray-200 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <button
                type="button"
                disabled={!customFrom || !customTo}
                onClick={() => { setPeriod('custom'); setFilterOpen(false) }}
                className="mt-2 w-full rounded-lg bg-brand-primary py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('common.apply', 'Appliquer')}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            {/* Card 1 — Ventes du jour */}
            <div className="group rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 leading-tight">
                  {t('dashboard.sales_today')}
                </span>
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                  <ShoppingCartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-gray-100">
                  {locked ? '—' : (today?.sales_count ?? 0)}
                </div>
                <div className="mt-1 sm:mt-2 text-xs">
                  <span className="font-medium text-slate-500 dark:text-gray-400">{channelLabel}</span>
                  {!locked && !activeBranch && (today?.shop_orders_count ?? 0) > 0 && (
                    <span className="ml-1 hidden sm:inline rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                      +{today!.shop_orders_count} {t('dashboard.online_shop')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2 — Chiffre d'affaires */}
            <div className="group rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 leading-tight">
                  {t('dashboard.revenue_today')}
                </span>
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
                  <BanknotesIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <div className="text-base sm:text-2xl font-black tracking-tight text-slate-900 dark:text-gray-100">
                  {locked ? '—' : formatCurrency(revenue)}
                </div>
                <div className="mt-1 sm:mt-2 text-xs">
                  <span className="font-medium text-slate-500 dark:text-gray-400">{channelLabel}</span>
                  {!locked && !activeBranch && (today?.pos_revenue ?? 0) > 0 && (
                    <span className="ml-1 hidden sm:inline rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                      POS {formatCurrency(today!.pos_revenue)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3 — Bénéfice estimé */}
            <div className="group rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 leading-tight">
                  {t('dashboard.profit')}
                </span>
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-110">
                  <ArrowTrendingUpIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <div className="text-base sm:text-2xl font-black tracking-tight text-slate-900 dark:text-gray-100">
                  {locked ? '—' : formatCurrency(Math.abs(profit))}
                </div>
                <div className="mt-1 sm:mt-2 text-xs">
                  <span className={`font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {profit >= 0 ? '▲' : '▼'} {profit >= 0 ? t('dashboard.profit_positive') : t('dashboard.profit_negative')}
                    {!locked && marginPct > 0 && <span className="hidden sm:inline"> ({marginPct}%)</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4 — Encaissements du jour */}
            <div className="group rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 leading-tight">
                  {t('dashboard.collected_day')}
                </span>
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-110">
                  <CreditCardIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <div className="text-base sm:text-2xl font-black tracking-tight text-slate-900 dark:text-gray-100">
                  {locked ? '—' : formatCurrency(todayCollected)}
                </div>
                <div className="mt-1 sm:mt-2 text-xs">
                  <span className="font-medium text-slate-500 dark:text-gray-400 truncate block">
                    {data?.by_payment_method && Object.keys(data.by_payment_method).length > 1
                      ? Object.keys(data.by_payment_method).map((m) => m.replace('_', ' ')).join(' & ')
                      : t('dashboard.pos')}
                  </span>
                  {!locked && revenue > 0 && (
                    <span className={`hidden sm:inline rounded-md px-2 py-0.5 font-bold ${
                      collectedPct >= 90 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {collectedPct}% {t('dashboard.collected_pct')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Graphique + Top produits ────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Graphique CA glissant — 7 cols */}
        <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700/60 pb-4">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-gray-100">
                {chartDays === 7  && t('dashboard.chart_7d',  'Chiffre d\'affaires des 7 derniers jours')}
                {chartDays === 30 && t('dashboard.chart_30d', 'Chiffre d\'affaires des 30 derniers jours')}
                {chartDays === 90 && t('dashboard.chart_90d', 'Chiffre d\'affaires des 3 derniers mois')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">{t('dashboard.chart_subtitle')}</p>
            </div>

            {/* Sélecteur durée graphique */}
            <div className="relative ml-3 flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:border-brand-primary transition cursor-pointer">
              <select
                value={chartDays}
                onChange={(e) => setChartDays(Number(e.target.value) as 7 | 30 | 90)}
                className="appearance-none bg-transparent pr-4 text-xs font-semibold text-slate-700 dark:text-gray-300 focus:outline-none cursor-pointer"
              >
                <option value={7}>{t('dashboard.chart_opt_7d',  '7 jours')}</option>
                <option value={30}>{t('dashboard.chart_opt_30d', '30 jours')}</option>
                <option value={90}>{t('dashboard.chart_opt_90d', '3 mois')}</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
            </div>
          </div>

          <div className="mt-4 flex-1">
            {isLoading ? (
              <div className="h-56 animate-pulse rounded-xl bg-slate-100 dark:bg-gray-700" />
            ) : (data?.week_chart ?? []).length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-700">
                  <PresentationChartLineIcon className="h-6 w-6 text-slate-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('dashboard.no_sales_week')}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">{t('dashboard.no_sales_week_desc')}</p>
              </div>
            ) : (
              <WeekChart data={data!.week_chart} />
            )}
          </div>

          {!isLoading && (data?.week_chart ?? []).length > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-gray-700/60 pt-3 text-xs text-slate-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-primary" />
                {activeBranch
                  ? `POS — ${activeBranch.name}`
                  : t('dashboard.legend_pos_web')}
              </span>
              <span className="font-semibold text-slate-700 dark:text-gray-300">
                {t('dashboard.avg_day', {
                  value: formatCurrency(
                    Math.round(
                      (data?.week_chart ?? []).reduce((s, d) => s + d.revenue, 0) /
                      Math.max((data?.week_chart ?? []).length, 1)
                    )
                  ),
                })}
              </span>
            </div>
          )}
        </div>

        {/* Top 5 produits — 5 cols */}
        <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700/60 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-gray-100">{t('dashboard.top_products')}</h2>
              <span className="rounded-full bg-slate-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-gray-400">
                {t('dashboard.volume')}
              </span>
            </div>
            <Link
              to="/reports"
              className="flex items-center gap-1 text-xs font-bold text-brand-primary transition hover:opacity-80"
            >
              {t('dashboard.view_all')} <ArrowUpRightIcon className="h-3 w-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-3 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : (data?.top_products ?? []).length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-700">
                <ChartBarIcon className="h-7 w-7 text-slate-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('dashboard.no_sales_today')}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">{t('dashboard.top_products_desc')}</p>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-slate-50 dark:divide-gray-700/40">
              {(data?.top_products ?? []).map((p, idx) => (
                <li key={p.product_id} className="group py-2.5">
                  <Link
                    to={`/products/${p.product_uid}`}
                    className="flex items-center justify-between gap-3 transition-colors hover:text-brand-primary"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-center text-xs font-extrabold text-slate-300 dark:text-gray-600 group-hover:text-brand-primary">
                        {idx + 1}
                      </span>
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.product_name}
                          className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 dark:border-gray-600 object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-100 dark:bg-gray-700 text-xs font-bold text-slate-400 dark:text-gray-500">
                          {p.product_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-gray-100">{p.product_name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400">
                          {p.quantity_sold} {t('dashboard.unit_sold')}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-slate-900 dark:text-gray-100">{formatCurrency(p.revenue)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Alertes stock + Ventes récentes ────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Alertes stock — 5 cols */}
        <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700/60 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-gray-100">{t('dashboard.stock_alerts')}</h2>
              {alertCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-sm">
                  {alertCount}
                </span>
              )}
            </div>
            <Link
              to="/stock"
              className="flex items-center gap-1 text-xs font-bold text-brand-primary transition hover:opacity-80"
            >
              {t('dashboard.view_all')} <ArrowUpRightIcon className="h-3 w-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-3 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : alertCount === 0 ? (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-3">
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700">{t('dashboard.no_stock_alerts')}</p>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-slate-50 dark:divide-gray-700/40">
              {(data?.stock_alerts ?? []).map((item) => (
                <li key={item.variant_id ?? item.product_id} className="py-3">
                  <Link
                    to={`/products/${item.product_uid}`}
                    className="flex items-center justify-between gap-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-gray-700/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 dark:border-gray-600 object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-100 dark:bg-gray-700 text-xs font-bold text-slate-400 dark:text-gray-500">
                          {item.product_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-gray-100">{item.product_name}</p>
                        {item.variant_summary && (
                          <p className="truncate text-[11px] text-slate-500 dark:text-gray-400">{item.variant_summary}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-gray-300">{item.current_stock}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        item.current_stock === 0
                          ? 'border-rose-200 bg-rose-100 text-rose-700'
                          : 'border-amber-200 bg-amber-100 text-amber-700'
                      }`}>
                        {item.current_stock === 0 ? 'Rupture' : 'Bas'}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-slate-100 dark:border-gray-700/60 pt-3">
            <button
              type="button"
              onClick={() => navigate('/purchases/new')}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 dark:bg-gray-700 py-2 text-xs font-bold text-slate-700 dark:text-gray-300 transition hover:bg-slate-200 dark:hover:bg-gray-600"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {t('dashboard.restock_cta')}
            </button>
          </div>
        </div>

        {/* Ventes récentes — 7 cols */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-gray-100">{t('dashboard.recent_sales_section')}</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">{t('dashboard.recent_sales_subtitle')}</p>
            </div>
            <Link
              to="/sales"
              className="flex items-center gap-1 text-xs font-bold text-brand-primary transition hover:opacity-80"
            >
              {t('dashboard.view_all')} <ArrowUpRightIcon className="h-3 w-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-3 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentSales.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-700">
                <ExclamationCircleIcon className="h-7 w-7 text-slate-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">Aucune vente récente</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">Les dernières transactions apparaîtront ici.</p>
            </div>
          ) : (
            <div className="mt-2 overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-700/60 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    <th className="py-2.5 font-bold">{t('dashboard.col_ref')}</th>
                    <th className="py-2.5 font-bold">{t('common.total')}</th>
                    <th className="py-2.5 font-bold">{t('common.status')}</th>
                    <th className="py-2.5 text-right font-bold">{t('dashboard.col_date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-gray-700/40">
                  {recentSales.map((sale) => {
                    const href    = sale.channel === 'shop' ? '/shop-orders' : `/sales/${sale.uid}`
                    const variant = STATUS_VARIANT[sale.status] ?? 'info'
                    const label   = STATUS_LABEL[sale.status] ?? sale.status
                    return (
                      <tr
                        key={`${sale.channel}-${sale.uid}`}
                        className="cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-gray-700/40"
                        onClick={() => navigate(href)}
                      >
                        <td className="py-3">
                          <div className="font-bold text-brand-primary">{sale.reference}</div>
                          {sale.customer && (
                            <div className="text-[11px] text-slate-500 dark:text-gray-400">{sale.customer}</div>
                          )}
                          {sale.channel === 'shop' && (
                            <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                              En ligne
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-extrabold text-slate-900 dark:text-gray-100">
                          {formatCurrency(sale.total)}
                        </td>
                        <td className="py-3">
                          <Badge variant={variant}>{label}</Badge>
                        </td>
                        <td className="py-3 text-right font-medium text-slate-500 dark:text-gray-400">
                          {formatDateTime(sale.confirmed_at ?? sale.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {recentSales.length > 0 && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-gray-700/60 pt-2.5 text-xs text-slate-500 dark:text-gray-400">
              <span>
                {t('dashboard.recent_count', { count: recentSales.length })}
              </span>
              <Link to="/sales" className="font-bold text-brand-primary hover:opacity-80 transition">
                {t('dashboard.view_all_sales')}
              </Link>
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
