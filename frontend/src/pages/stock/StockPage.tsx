import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import CanDo from '@/components/ui/CanDo'
import { StockAdjustModal, type StockAdjustPrefill } from '@/components/stock/StockAdjustModal'
import { getMovements, getAlerts, getExpiring } from '@/services/api/stock'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import type { StockMovement, StockAlert } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'movements' | 'alerts' | 'expiring'

const TAB_LABELS: Record<Tab, string> = {
  movements: 'Mouvements',
  alerts: 'Alertes stock',
  expiring: 'Lots expirants',
}

// ── Movement helpers ───────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { variant: 'success' | 'danger' | 'warning' | 'default'; label: string }> = {
  in:         { variant: 'success', label: 'Entrée' },
  out:        { variant: 'danger',  label: 'Sortie' },
  adjustment: { variant: 'warning', label: 'Inventaire' },
  return:     { variant: 'default', label: 'Retour' },
}

const SOURCE_LABEL: Record<string, string> = {
  manual:   'Manuel',
  sale:     'Vente',
  purchase: 'Achat',
  return:   'Retour',
}

function movementDesignation(m: StockMovement): string {
  return [m.product?.name, m.variant?.attribute_summary].filter(Boolean).join(' — ')
}

// ── Sub-tabs ──────────────────────────────────────────────────────────────

function MovementsTab() {
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  // Reset page on filter change
  useEffect(() => setPage(1), [type, from, to])

  const { data, isLoading } = useQuery({
    queryKey: ['stock', 'movements', type, from, to, page],
    queryFn: () => getMovements({ type: type || undefined, from: from || undefined, to: to || undefined, page }),
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            title="Filtrer par type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-gray-200 py-2 px-3 text-sm bg-white"
          >
            <option value="">Tous</option>
            <option value="in">Entrée</option>
            <option value="out">Sortie</option>
            <option value="adjustment">Inventaire</option>
            <option value="sale">Ventes</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Du</label>
          <input
            type="date"
            title="Date de début"
            placeholder="jj/mm/aaaa"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-200 py-2 px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Au</label>
          <input
            type="date"
            title="Date de fin"
            placeholder="jj/mm/aaaa"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-200 py-2 px-3 text-sm"
          />
        </div>
        {(type || from || to) && (
          <button
            onClick={() => { setType(''); setFrom(''); setTo('') }}
            className="text-xs text-indigo-500 hover:underline self-end pb-2"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Date', 'Produit', 'Type', 'Quantité', 'Stock', 'Opérateur', 'Source'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
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
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  Aucun mouvement de stock
                </td>
              </tr>
            ) : (
              data?.data.map((m) => {
                const badge = TYPE_BADGE[m.type] ?? { variant: 'default' as const, label: m.type }
                const qtySign = m.type === 'out' ? '-' : m.type === 'in' ? '+' : ''
                const qtyColor = m.type === 'in' ? 'text-green-600' : m.type === 'out' ? 'text-red-600' : 'text-gray-700'
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(m.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                      <p className="truncate">{movementDesignation(m)}</p>
                      {m.lot && <p className="text-xs text-gray-400">Lot {m.lot.lot_number}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className={`px-4 py-3 font-semibold tabular-nums ${qtyColor}`}>
                      {qtySign}{m.quantity}
                    </td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums whitespace-nowrap">
                      {m.stock_before} → {m.stock_after}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {m.user?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
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
        placeholder="Rechercher un produit…"
        className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition"
      />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Produit', 'Variante', 'Catégorie', 'Stock actuel', 'Seuil', 'État', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
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
                  Aucune alerte stock
                </td>
              </tr>
            ) : (
              data?.data.map((alert: StockAlert) => (
                <tr key={`${alert.product_id}-${alert.variant_id ?? 'base'}`} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">{alert.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">{alert.variant_summary ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{alert.category_name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-gray-900">
                    {alert.current_stock}
                    {alert.unit && <span className="ml-1 text-xs text-gray-400">{alert.unit}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 tabular-nums">{alert.threshold}</td>
                  <td className="px-4 py-3">
                    <Badge variant={alert.current_stock <= 0 ? 'danger' : 'warning'}>
                      {alert.current_stock <= 0 ? 'Rupture' : 'Stock bas'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <CanDo permission="stock.adjust">
                      <button
                        onClick={() => onAdjust({
                          product_id: alert.product_id,
                          product_name: alert.product_name,
                          variant_id: alert.variant_id,
                          variant_summary: alert.variant_summary,
                        })}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                      >
                        <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                        Ajuster
                      </button>
                    </CanDo>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['stock', 'expiring', page],
    queryFn: () => getExpiring({ page }),
  })

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Produit', 'Variante', 'Lot', 'Date expiry', 'Jours restants', 'Quantité'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
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
                  Aucun lot expirant dans les 30 prochains jours
                </td>
              </tr>
            ) : (
              data?.data.map((lot) => {
                const urgent = lot.days_remaining <= 7
                return (
                  <tr key={`${lot.product_id}-${lot.lot_number}`} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{lot.product_name}</td>
                    <td className="px-4 py-3 text-gray-500">{lot.variant_summary ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{lot.lot_number}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(lot.expiry_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={urgent ? 'danger' : 'warning'}>
                        {lot.days_remaining} j
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-gray-900">
                      {lot.quantity_remaining}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
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

// ── Main page ─────────────────────────────────────────────────────────────

export default function StockPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('movements')
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
        <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
        <CanDo permission="stock.adjust">
          <Button onClick={() => openAdjust()} icon={<PlusIcon className="h-4 w-4" />}>
            Ajuster le stock
          </Button>
        </CanDo>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 -mb-px">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'pb-3 text-sm font-medium border-b-2 transition',
                tab === t
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'movements' && <MovementsTab />}
      {tab === 'alerts'    && <AlertsTab onAdjust={(p) => openAdjust(p)} />}
      {tab === 'expiring'  && <ExpiringTab />}

      <StockAdjustModal
        isOpen={adjustOpen}
        prefill={prefill}
        onClose={() => { setAdjustOpen(false); setPrefill(null) }}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['stock'] })}
      />
    </div>
  )
}
