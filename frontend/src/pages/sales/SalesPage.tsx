import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  XCircleIcon,
  ReceiptRefundIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { getSales, cancelSale, openSalePdf } from '@/services/api/sales'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Sale } from '@/types'

const STATUS_VARIANT: Record<Sale['status'], 'success' | 'default' | 'danger'> = {
  confirmed: 'success',
  draft:     'default',
  cancelled: 'danger',
}

export default function SalesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const STATUS_LABEL: Record<Sale['status'], string> = {
    confirmed: t('sales.confirmed'),
    draft:     t('sales.draft'),
    cancelled: t('sales.cancelled'),
  }

  // ── Filtres ──────────────────────────────────────────────────────────────
  const [search, setSearch]   = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [status, setStatus]   = useState('')
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [page, setPage]       = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebSearch(search); setPage(1) }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // ── Données ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['sales', { search: debSearch, status, from, to, page }],
    queryFn: () => getSales({ search: debSearch || undefined, status: status || undefined, from: from || undefined, to: to || undefined, page }),
    placeholderData: (prev) => prev,
  })

  // ── Annulation ────────────────────────────────────────────────────────────
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null)
  const cancelMutation = useMutation({
    mutationFn: (uid: string) => cancelSale(uid),
    onSuccess: (_, uid) => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sale', uid] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setCancelTarget(null)
      toast.success(t('sales.cancelled_ok'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  // ── PDF ───────────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const handlePdf = async (uid: string, reference: string) => {
    setPdfLoading(uid)
    try { await openSalePdf(uid, reference) } finally { setPdfLoading(null) }
  }

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns: Column<Sale>[] = [
    {
      key: 'reference',
      header: t('sales.reference'),
      render: (s) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{s.reference}</span>
          {(s.returns_count ?? 0) > 0 && (
            <span
              title={t('sales.has_returns')}
              className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-amber-200"
            >
              <ReceiptRefundIcon className="h-3 w-3" />
              {s.returns_count}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: t('sales.customer'),
      render: (s) =>
        s.customer ? (
          <span className="text-sm text-gray-700 dark:text-gray-300">{s.customer.name}</span>
        ) : (
          <span className="text-sm text-gray-300 dark:text-gray-600">{t('sales.anonymous')}</span>
        ),
    },
    {
      key: 'date',
      header: t('sales.date'),
      render: (s) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTime(s.confirmed_at ?? s.created_at)}
        </span>
      ),
    },
    {
      key: 'total',
      header: t('common.total'),
      align: 'right',
      render: (s) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(s.total)}</span>
      ),
    },
    {
      key: 'paid_amount',
      header: t('sales.paid'),
      align: 'right',
      render: (s) => (
        <span className="text-sm font-medium text-emerald-600">{formatCurrency(s.paid_amount)}</span>
      ),
    },
    {
      key: 'due',
      header: t('sales.due'),
      align: 'right',
      render: (s) => {
        const due = parseFloat(s.total) - parseFloat(s.paid_amount)
        if (due > 0) {
          return <span className="font-semibold text-red-600">{formatCurrency(due)}</span>
        }
        if (s.status === 'confirmed') {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200">
              <CheckCircleIcon className="h-3 w-3" />
              {t('sales.settled')}
            </span>
          )
        }
        return <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
      },
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      render: (s) => (
        <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          {/* Voir */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/sales/${s.uid}`) }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
            title={t('sales.details')}
          >
            <EyeIcon className="h-4 w-4" />
          </button>

          {/* PDF */}
          <CanDo permission="sales.pdf">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handlePdf(s.uid, s.reference) }}
              disabled={pdfLoading === s.uid}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-40"
              title={t('sales.export_pdf')}
            >
              {pdfLoading === s.uid ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <DocumentArrowDownIcon className="h-4 w-4" />
              )}
            </button>
          </CanDo>

          {/* Annuler — seulement si confirmed */}
          {s.status === 'confirmed' && (
            <CanDo permission="sales.delete">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setCancelTarget(s) }}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                title={t('sales.cancel_title')}
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </CanDo>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">{t('sales.title')}</h1>
        <CanDo permission="sales.create">
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => navigate('/sales/new')}
          >
            {t('sales.new')}
          </Button>
        </CanDo>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <Input
            placeholder={t('sales.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">{t('sales.filter_all')}</option>
            <option value="confirmed">{t('sales.confirmed')}</option>
            <option value="draft">{t('sales.draft')}</option>
            <option value="cancelled">{t('sales.cancelled')}</option>
          </Select>
        </div>
        <div className="w-40">
          <Input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1) }}
            title="Du"
          />
        </div>
        <div className="w-40">
          <Input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1) }}
            title="Au"
          />
        </div>
      </div>

      {/* Table */}
      <Table<Sale>
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(s) => s.id}
        loading={isLoading}
        skeletonRows={8}
        emptyMessage={<EmptyState icon={<ReceiptRefundIcon className="h-7 w-7" />} title={t('sales.empty_title')} description={t('sales.empty_desc')} />}
        onRowClick={(s) => navigate(`/sales/${s.uid}`)}
        mobileCard={(s) => {
          const due = parseFloat(s.total) - parseFloat(s.paid_amount)
          return (
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{s.reference}</span>
                <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {s.customer ? s.customer.name : <span className="text-gray-300 dark:text-gray-600">{t('sales.anonymous')}</span>}
                </span>
                <span className="text-xs text-gray-400">{formatDateTime(s.confirmed_at ?? s.created_at)}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(s.total)}</span>
                {due > 0 ? (
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(due)}</span>
                ) : (
                  <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                )}
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                <CanDo permission="sales.pdf">
                  <button
                    type="button"
                    onClick={() => handlePdf(s.uid, s.reference)}
                    disabled={pdfLoading === s.uid}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                  >
                    {pdfLoading === s.uid ? (
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                    )}
                    PDF
                  </button>
                </CanDo>
                {s.status === 'confirmed' && (
                  <CanDo permission="sales.delete">
                    <button
                      type="button"
                      onClick={() => setCancelTarget(s)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
                    >
                      <XCircleIcon className="h-3.5 w-3.5" />
                      {t('sales.cancel')}
                    </button>
                  </CanDo>
                )}
              </div>
            </div>
          )
        }}
      />

      {/* Pagination */}
      {data && data.last_page > 1 && (
        <Pagination
          currentPage={data.current_page}
          lastPage={data.last_page}
          total={data.total}
          perPage={data.per_page}
          onPageChange={setPage}
        />
      )}

      {/* Modal annulation */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={t('sales.cancel_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              {t('common.back')}
            </Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.uid)}
            >
              {t('sales.cancel_confirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('sales.cancel')}{' '}
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{cancelTarget?.reference}</span> ?{' '}
          {t('sales.cancel_stock')}
        </p>
      </Modal>
    </div>
  )
}
