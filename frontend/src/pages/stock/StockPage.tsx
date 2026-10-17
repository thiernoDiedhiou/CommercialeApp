import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { PlusIcon, AdjustmentsHorizontalIcon, ClipboardDocumentListIcon, TrashIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'
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

const TAB_LABELS: Record<Tab, string> = {
  movements:  'Mouvements',
  alerts:     'Alertes stock',
  expiring:   'Lots expirants',
  inventaire: 'Inventaires',
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
            type="button"
            onClick={() => { setType(''); setFrom(''); setTo('') }}
            className="text-xs text-brand-primary hover:underline self-end pb-2"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Vue tableau (sm+) ───────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
            ) : (data?.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                      <ArrowsUpDownIcon className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Aucun mouvement de stock</p>
                    <p className="mt-1 text-xs text-slate-400">Les entrées et sorties de stock apparaîtront ici.</p>
                  </div>
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

      {/* ── Vue carte (mobile) ───────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))
        ) : (data?.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <ArrowsUpDownIcon className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Aucun mouvement de stock</p>
            <p className="mt-1 text-xs text-slate-400">Les entrées et sorties de stock apparaîtront ici.</p>
          </div>
        ) : (
          data?.data.map((m) => {
            const badge = TYPE_BADGE[m.type] ?? { variant: 'default' as const, label: m.type }
            const qtySign = m.type === 'out' ? '-' : m.type === 'in' ? '+' : ''
            const qtyColor = m.type === 'in' ? 'text-green-600' : m.type === 'out' ? 'text-red-600' : 'text-gray-700'
            return (
              <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-medium text-sm text-gray-900 truncate flex-1">{movementDesignation(m)}</p>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-lg font-bold tabular-nums ${qtyColor}`}>{qtySign}{m.quantity}</span>
                  <span className="text-xs text-gray-400 tabular-nums">{m.stock_before} → {m.stock_after}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{formatDateTime(m.created_at)}</span>
                  <span>{SOURCE_LABEL[m.source] ?? m.source}{m.unit_cost ? ` · ${formatCurrency(m.unit_cost)}/u` : ''}</span>
                </div>
                {m.user && <p className="text-xs text-gray-400 mt-0.5">{m.user.name}</p>}
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
        className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-primary transition"
      />

      {/* ── Vue tableau (sm+) ───────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
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

      {/* ── Vue carte (mobile) ───────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))
        ) : data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Aucune alerte stock</p>
        ) : (
          data?.data.map((alert: StockAlert) => (
            <div key={`${alert.product_id}-${alert.variant_id ?? 'base'}`} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{alert.product_name}</p>
                  {alert.variant_summary && <p className="text-xs text-gray-400">{alert.variant_summary}</p>}
                </div>
                <Badge variant={alert.current_stock <= 0 ? 'danger' : 'warning'}>
                  {alert.current_stock <= 0 ? 'Rupture' : 'Stock bas'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold tabular-nums text-gray-900">
                  {alert.current_stock}{alert.unit ? ` ${alert.unit}` : ''}
                  <span className="text-xs font-normal text-gray-400 ml-1">/ seuil {alert.threshold}</span>
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
                    Ajuster
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

const DAYS_OPTIONS = [
  { value: 7,  label: '7 prochains jours' },
  { value: 15, label: '15 prochains jours' },
  { value: 30, label: '30 prochains jours' },
  { value: 60, label: '60 prochains jours' },
]

function ExpiringTab() {
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit…"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-primary transition w-full max-w-xs"
        />
        <div>
          <label htmlFor="expiring-days" className="block text-xs text-gray-500 mb-1">Fenêtre</label>
          <select
            id="expiring-days"
            title="Filtrer par nombre de jours"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-gray-200 py-2 px-3 text-sm bg-white"
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
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Vue tableau (sm+) ───────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                  {debouncedSearch
                    ? `Aucun lot expirant pour « ${debouncedSearch} » dans les ${days} prochains jours`
                    : `Aucun lot expirant dans les ${days} prochains jours`}
                </td>
              </tr>
            ) : (
              data?.data.map((lot) => {
                const expired = lot.days_remaining < 0
                const urgent  = lot.days_remaining <= 7
                return (
                  <tr key={`${lot.product_id}-${lot.lot_number}`} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{lot.product_name}</td>
                    <td className="px-4 py-3 text-gray-500">{lot.variant_summary ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{lot.lot_number}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(lot.expiry_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={expired || urgent ? 'danger' : 'warning'}>
                        {expired ? 'Expiré' : lot.days_remaining === 0 ? "Aujourd'hui" : `${lot.days_remaining} j`}
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

      {/* ── Vue carte (mobile) ───────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))
        ) : data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            {debouncedSearch
              ? `Aucun lot expirant pour « ${debouncedSearch} » dans les ${days} prochains jours`
              : `Aucun lot expirant dans les ${days} prochains jours`}
          </p>
        ) : (
          data?.data.map((lot) => {
            const expired = lot.days_remaining < 0
            const urgent  = lot.days_remaining <= 7
            return (
              <div key={`${lot.product_id}-${lot.lot_number}`} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{lot.product_name}</p>
                    {lot.variant_summary && <p className="text-xs text-gray-400">{lot.variant_summary}</p>}
                  </div>
                  <Badge variant={expired || urgent ? 'danger' : 'warning'}>
                    {expired ? 'Expiré' : lot.days_remaining === 0 ? "Aujourd'hui" : `${lot.days_remaining} j`}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Lot <span className="font-mono text-gray-700">{lot.lot_number}</span> · expire le {formatDate(lot.expiry_date)}</span>
                  <span className="font-semibold text-gray-900 tabular-nums">{lot.quantity_remaining}</span>
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
      toast.success('Inventaire supprimé.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Chaque inventaire liste tous vos produits — saisissez la quantité comptée pour détecter les écarts.
        </p>
        <CanDo permission="stock.adjust">
          <Button
            type="button"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setNewOpen(true)}
          >
            Nouvel inventaire
          </Button>
        </CanDo>
      </div>

      {/* ── Vue tableau (sm+) ── */}
      <div className="hidden sm:block rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Référence', 'Date', 'Créé par', 'Produits', 'Statut', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  Aucun inventaire — créez-en un pour commencer.
                </td>
              </tr>
            ) : (
              data?.data.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => navigate(`/stock/inventory/${s.uid}`)}
                >
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">{s.reference}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3 text-gray-600">{s.creator?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.items_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.status === 'confirmed' ? 'success' : 'warning'}>
                      {s.status === 'confirmed' ? 'Confirmé' : 'Brouillon'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === 'draft' && (
                      <CanDo permission="stock.adjust">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(s) }}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
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
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))
        ) : data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Aucun inventaire</p>
        ) : (
          data?.data.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/stock/inventory/${s.uid}`)}
              className="rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-sm font-semibold text-gray-900">{s.reference}</span>
                <Badge variant={s.status === 'confirmed' ? 'success' : 'warning'}>
                  {s.status === 'confirmed' ? 'Confirmé' : 'Brouillon'}
                </Badge>
              </div>
              <p className="text-xs text-gray-400">{formatDate(s.created_at)} · {s.items_count ?? 0} produit{(s.items_count ?? 0) > 1 ? 's' : ''}</p>
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
        title="Nouvel inventaire"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Annuler</Button>
            <Button
              icon={<ClipboardDocumentListIcon className="h-4 w-4" />}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Créer
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Un inventaire liste tous vos produits actifs. Saisissez les quantités comptées produit par produit, puis validez pour appliquer les ajustements.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex : Inventaire mensuel octobre 2026…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-primary resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Modal suppression */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer l'inventaire"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.uid)}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Supprimer définitivement <strong>{deleteTarget?.reference}</strong> ? Aucun ajustement ne sera appliqué.
        </p>
      </Modal>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function StockPage() {
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
              type="button"
              onClick={() => setTab(t)}
              className={[
                'pb-3 text-sm font-medium border-b-2 transition',
                tab === t
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {TAB_LABELS[t]}
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
