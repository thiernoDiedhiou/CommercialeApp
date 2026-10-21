import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  CheckIcon, ArrowDownTrayIcon, DocumentArrowDownIcon,
  MagnifyingGlassIcon, XMarkIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import {
  getInventorySession, getInventoryLines, saveInventoryItem,
  confirmInventorySession, deleteInventorySession,
  downloadInventoryCsv, downloadInventoryPdf,
} from '@/services/api/inventory'
import { getCategories } from '@/services/api/categories'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { Skeleton } from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import type { InventoryLine } from '@/types'

// ── Ligne éditable ──────────────────────────────────────────────────────────

function InventoryLineRow({
  line,
  sessionUid,
  isDraft,
  onSaved,
}: {
  line: InventoryLine
  sessionUid: string
  isDraft: boolean
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState<string>(line.counted_qty !== null ? String(line.counted_qty) : '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync si les données externes changent (ex: rechargement)
  useEffect(() => {
    setValue(line.counted_qty !== null ? String(line.counted_qty) : '')
  }, [line.counted_qty])

  const diff = value !== '' ? parseFloat(value) - line.expected_qty : null
  const diffColor = diff === null ? '' : diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'

  const handleBlur = async () => {
    if (!isDraft) return
    if (value === '' || value === String(line.counted_qty)) return

    const counted = parseFloat(value)
    if (isNaN(counted) || counted < 0) return

    setSaving(true)
    try {
      await saveInventoryItem(sessionUid, {
        product_id:   line.product_id,
        variant_id:   line.variant_id,
        expected_qty: line.expected_qty,
        counted_qty:  counted,
      })
      onSaved()
    } catch {
      toast.error(t('stock.save_error'))
    } finally {
      setSaving(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
      // Avance au champ suivant
      const inputs = document.querySelectorAll<HTMLInputElement>('input[data-inv-input]')
      const idx = Array.from(inputs).indexOf(inputRef.current!)
      inputs[idx + 1]?.focus()
    }
  }

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
      <td className="px-4 py-3">
        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{line.name}</p>
        {line.variant_summary && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{line.variant_summary}</p>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">{line.sku || '—'}</td>
      <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 hidden md:table-cell">{line.category_name || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right tabular-nums">{line.expected_qty}</td>
      <td className="px-4 py-3">
        {isDraft ? (
          <input
            ref={inputRef}
            data-inv-input
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKey}
            placeholder="—"
            disabled={saving}
            className={`w-20 rounded-lg border px-2 py-1 text-sm text-right tabular-nums outline-none transition
              ${saving ? 'opacity-50' : ''}
              ${value !== '' ? 'border-brand-primary bg-blue-50 dark:bg-blue-900/30 font-semibold' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100'}
              focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20`}
          />
        ) : (
          <span className="text-sm tabular-nums text-right block">{line.counted_qty ?? '—'}</span>
        )}
      </td>
      <td className={`px-4 py-3 text-sm text-right tabular-nums font-semibold ${diffColor}`}>
        {diff !== null ? (diff >= 0 ? `+${diff}` : String(diff)) : '—'}
      </td>
    </tr>
  )
}

// ── Mobile line card ─────────────────────────────────────────────────────────

function InventoryLineCard({
  line,
  sessionUid,
  isDraft,
  onSaved,
}: {
  line: InventoryLine
  sessionUid: string
  isDraft: boolean
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState<string>(line.counted_qty !== null ? String(line.counted_qty) : '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(line.counted_qty !== null ? String(line.counted_qty) : '')
  }, [line.counted_qty])

  const diff = value !== '' ? parseFloat(value) - line.expected_qty : null

  const handleBlur = async () => {
    if (!isDraft || value === '' || value === String(line.counted_qty)) return
    const counted = parseFloat(value)
    if (isNaN(counted) || counted < 0) return
    setSaving(true)
    try {
      await saveInventoryItem(sessionUid, {
        product_id:   line.product_id,
        variant_id:   line.variant_id,
        expected_qty: line.expected_qty,
        counted_qty:  counted,
      })
      onSaved()
    } catch {
      toast.error(t('stock.save_error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{line.name}</p>
          {line.variant_summary && <p className="text-xs text-gray-400 dark:text-gray-500">{line.variant_summary}</p>}
          {line.category_name && <p className="text-xs text-gray-300 dark:text-gray-600">{line.category_name}</p>}
        </div>
        {diff !== null && (
          <span className={`text-sm font-bold tabular-nums shrink-0 ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {diff >= 0 ? `+${diff}` : String(diff)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {t('stock.inventory_expected')} <span className="font-semibold text-gray-700 dark:text-gray-300">{line.expected_qty}</span>
        </div>
        {isDraft ? (
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">{t('stock.inventory_counted_label')}</span>
            <input
              data-inv-input
              type="number"
              min="0"
              step="1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={handleBlur}
              placeholder="—"
              disabled={saving}
              className={`w-20 rounded-lg border px-2 py-1 text-sm text-right tabular-nums outline-none
                ${value !== '' ? 'border-brand-primary bg-blue-50 dark:bg-blue-900/30 font-semibold' : 'border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'}
                focus:border-brand-primary`}
            />
          </div>
        ) : (
          <span className="ml-auto text-sm tabular-nums">{line.counted_qty ?? '—'}</span>
        )}
      </div>
    </div>
  )
}

// ── Page principale ──────────────────────────────────────────────────────────

export default function InventorySessionPage() {
  const { t } = useTranslation()
  const { uid } = useParams<{ uid: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [search, setSearch]           = useState('')
  const [debouncedSearch, setDebSrch] = useState('')
  const [categoryId, setCategoryId]   = useState<number | undefined>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen]   = useState(false)
  const [csvLoading, setCsvLoading]   = useState(false)
  const [pdfLoading, setPdfLoading]   = useState(false)

  // Debounce recherche
  useEffect(() => {
    const t = setTimeout(() => setDebSrch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['inventory-session', uid],
    queryFn: () => getInventorySession(uid!),
    enabled: !!uid,
  })

  const { data: lines, isLoading: linesLoading } = useQuery({
    queryKey: ['inventory-lines', uid, debouncedSearch, categoryId],
    queryFn: () => getInventoryLines(uid!, { search: debouncedSearch || undefined, category_id: categoryId }),
    enabled: !!uid,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  })

  const isDraft = session?.status === 'draft'

  const confirmMutation = useMutation({
    mutationFn: () => confirmInventorySession(uid!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-session', uid] })
      qc.invalidateQueries({ queryKey: ['inventory-sessions'] })
      qc.invalidateQueries({ queryKey: ['inventory-lines', uid] })
      toast.success(t('stock.inventory_confirmed_ok'))
      setConfirmOpen(false)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteInventorySession(uid!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-sessions'] })
      toast.success(t('stock.inventory_deleted_ok'))
      navigate('/stock', { state: { tab: 'inventaire' } })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handleCsv = async () => {
    if (!session) return
    setCsvLoading(true)
    try { await downloadInventoryCsv(uid!, session.reference) } finally { setCsvLoading(false) }
  }

  const handlePdf = async () => {
    if (!session) return
    setPdfLoading(true)
    try { await downloadInventoryPdf(uid!, session.reference) } finally { setPdfLoading(false) }
  }

  const countedCount = lines?.filter((l) => l.counted_qty !== null).length ?? 0
  const totalCount   = lines?.length ?? 0
  const diffCount    = lines?.filter((l) => l.counted_qty !== null && l.counted_qty !== l.expected_qty).length ?? 0

  if (sessionLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/stock')} className="rounded-lg p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">{session.reference}</h1>
              <Badge variant={session.status === 'confirmed' ? 'success' : 'warning'}>
                {session.status === 'confirmed' ? t('stock.confirmed') : t('stock.inventory_status_draft')}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {t('stock.created_on')} {formatDate(session.created_at)}
              {session.creator && ` ${t('stock.created_by')} ${session.creator.name}`}
              {session.confirmed_at && ` · ${t('stock.confirmed_on')} ${formatDate(session.confirmed_at)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            loading={csvLoading}
            icon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={handleCsv}
          >
            CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            loading={pdfLoading}
            icon={<DocumentArrowDownIcon className="h-4 w-4" />}
            onClick={handlePdf}
          >
            PDF
          </Button>
          {isDraft && (
            <>
              <Button
                type="button"
                variant="danger"
                onClick={() => setDeleteOpen(true)}
              >
                {t('common.delete')}
              </Button>
              <Button
                type="button"
                icon={<CheckIcon className="h-4 w-4" />}
                onClick={() => setConfirmOpen(true)}
                disabled={countedCount === 0}
              >
                {t('stock.validate_inventory')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Stats rapides ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-center">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{countedCount}/{totalCount}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('stock.products_counted')}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-center">
          <p className={`text-xl font-bold ${diffCount > 0 ? 'text-orange-500' : 'text-green-600'}`}>{diffCount}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('stock.with_gap')}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-center">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {lines ? Math.round((countedCount / Math.max(totalCount, 1)) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('stock.progress')}</p>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder={t('stock.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-primary transition"
          />
        </div>
        <select
          title="Filtrer par catégorie"
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
          className="rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-3 py-2 text-sm bg-white"
        >
          <option value="">{t('stock.all_categories')}</option>
          {categoriesData?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {(search || categoryId) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setCategoryId(undefined) }}
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-2"
          >
            <XMarkIcon className="h-3.5 w-3.5" /> {t('stock.reset_filters')}
          </button>
        )}
      </div>

      {/* ── Tableau (sm+) ── */}
      <div className="hidden sm:block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('stock.col_product')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">{t('stock.col_sku')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">{t('stock.col_category')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('stock.col_expected')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('stock.col_counted')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('stock.col_gap')}</th>
            </tr>
          </thead>
          <tbody>
            {linesLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : lines?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                  {t('stock.no_product_found')}
                </td>
              </tr>
            ) : (
              lines?.map((line) => (
                <InventoryLineRow
                  key={`${line.product_id}-${line.variant_id}`}
                  line={line}
                  sessionUid={uid!}
                  isDraft={isDraft}
                  onSaved={() => qc.invalidateQueries({ queryKey: ['inventory-session', uid] })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Cartes (mobile) ── */}
      <div className="sm:hidden space-y-2">
        {linesLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))
        ) : lines?.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{t('stock.no_product_found')}</p>
        ) : (
          lines?.map((line) => (
            <InventoryLineCard
              key={`${line.product_id}-${line.variant_id}`}
              line={line}
              sessionUid={uid!}
              isDraft={isDraft}
              onSaved={() => qc.invalidateQueries({ queryKey: ['inventory-session', uid] })}
            />
          ))
        )}
      </div>

      {/* ── Modal confirmation ── */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('stock.confirm_inventory_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</Button>
            <Button
              icon={<CheckIcon className="h-4 w-4" />}
              loading={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              {t('stock.apply_confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('stock.confirm_inventory_text', { ref: session.reference })}
          </p>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 text-sm space-y-1">
            <p><span className="text-gray-500 dark:text-gray-400">{t('stock.counted_products_label')} :</span> <strong className="dark:text-gray-200">{countedCount}</strong></p>
            <p><span className="text-gray-500 dark:text-gray-400">{t('stock.with_gap_label')} :</span> <strong className={diffCount > 0 ? 'text-orange-500' : 'text-green-600'}>{diffCount}</strong></p>
          </div>
          {diffCount === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('stock.no_adjustments')}</p>
          )}
        </div>
      </Modal>

      {/* ── Modal suppression ── */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('stock.delete_inventory_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('stock.delete_inventory_confirm', { ref: session.reference })}
          {' '}{t('stock.delete_inventory_no_adjust')}
        </p>
      </Modal>
    </div>
  )
}
