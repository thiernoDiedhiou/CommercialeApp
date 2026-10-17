import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon, EyeIcon, DocumentArrowDownIcon,
  PaperAirplaneIcon, XCircleIcon, TrashIcon, ChevronDownIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import {
  getInvoices, sendInvoice, cancelInvoice,
  deleteInvoice, openInvoicePdf,
} from '@/services/api/invoices'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, InvoiceStatus, InvoiceType } from '@/types'

const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'info' | 'success' | 'danger' | 'warning'> = {
  draft:     'default',
  sent:      'info',
  paid:      'success',
  overdue:   'danger',
  cancelled: 'default',
}

export default function InvoicesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const STATUS_LABEL: Record<InvoiceStatus, string> = {
    draft:     t('invoices.draft'),
    sent:      t('invoices.sent'),
    paid:      t('invoices.paid'),
    overdue:   t('invoices.overdue'),
    cancelled: t('invoices.cancelled'),
  }
  const QUOTE_LABEL: Record<InvoiceStatus, string> = {
    draft:     t('invoices.draft'),
    sent:      t('invoices.quote_sent'),
    paid:      t('invoices.quote_accepted'),
    overdue:   t('invoices.quote_expired'),
    cancelled: t('invoices.cancelled'),
  }
  const SENT_LABEL: Record<InvoiceType, Record<InvoiceStatus, string>> = {
    invoice: STATUS_LABEL,
    quote: QUOTE_LABEL,
  }

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [docType, setDocType]   = useState<InvoiceType | ''>('')
  const [search, setSearch]     = useState('')
  const [debSearch, setDeb]     = useState('')
  const [status, setStatus]     = useState('')
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const [page, setPage]         = useState(1)
  const [newOpen, setNewOpen]   = useState(false)

  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => { setDeb(search); setPage(1) }, 300)
    return () => { if (debRef.current) clearTimeout(debRef.current) }
  }, [search])

  // ── Données ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { search: debSearch, docType, status, from, to, page }],
    queryFn: () => getInvoices({
      search: debSearch || undefined,
      type:   docType   || undefined,
      status: status    || undefined,
      from:   from      || undefined,
      to:     to        || undefined,
      page,
    }),
    placeholderData: (prev) => prev,
  })

  // ── Actions ───────────────────────────────────────────────────────────────
  const [sendTarget, setSendTarget]     = useState<Invoice | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [pdfLoading, setPdfLoading]     = useState<string | null>(null)

  const sendMutation = useMutation({
    mutationFn: (uid: string) => sendInvoice(uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setSendTarget(null); toast.success(t('invoices.sent_ok')) },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
  const cancelMutation = useMutation({
    mutationFn: (uid: string) => cancelInvoice(uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setCancelTarget(null); toast.success(t('invoices.cancelled_ok')) },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
  const deleteMutation = useMutation({
    mutationFn: (uid: string) => deleteInvoice(uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setDeleteTarget(null); toast.success(t('invoices.deleted_ok')) },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handlePdf = async (uid: string, reference: string) => {
    setPdfLoading(uid)
    try { await openInvoicePdf(uid, reference) } finally { setPdfLoading(null) }
  }

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns: Column<Invoice>[] = [
    {
      key: 'reference',
      header: t('invoices.reference'),
      render: (i) => <span className="font-mono text-sm font-semibold text-gray-900">{i.reference}</span>,
    },
    {
      key: 'customer',
      header: t('invoices.customer'),
      render: (i) => i.customer
        ? <span className="text-sm text-gray-700">{i.customer.name}</span>
        : <span className="text-sm text-gray-300">—</span>,
    },
    {
      key: 'issue_date',
      header: t('invoices.issue_date'),
      render: (i) => <span className="text-sm text-gray-600">{formatDate(i.issue_date)}</span>,
    },
    {
      key: 'due_date',
      header: t('invoices.due_date'),
      render: (i) => (
        <span className={`text-sm ${i.status === 'overdue' ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
          {formatDate(i.due_date)}
        </span>
      ),
    },
    {
      key: 'total',
      header: t('common.total'),
      align: 'right',
      render: (i) => <span className="font-medium text-gray-900">{formatCurrency(i.total)}</span>,
    },
    {
      key: 'paid_amount',
      header: t('invoices.amount_paid'),
      align: 'right',
      render: (i) => {
        const due = Math.max(0, parseFloat(i.total) - parseFloat(i.paid_amount))
        return due > 0 && parseFloat(i.paid_amount) > 0
          ? <span className="text-sm text-emerald-600">{formatCurrency(i.paid_amount)}</span>
          : <span className="text-sm text-gray-300">—</span>
      },
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      render: (i) => (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {i.type === 'quote' && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">{t('invoices.type_quote')}</span>
          )}
          {i.credit_note_for_id && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">{t('invoices.type_credit_note')}</span>
          )}
          <Badge variant={STATUS_VARIANT[i.status]}>
            {(SENT_LABEL[i.type ?? 'invoice'] ?? STATUS_LABEL)[i.status]}
          </Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) => (
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${i.uid}`) }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title={t('common.view')}>
            <EyeIcon className="h-4 w-4" />
          </button>

          <CanDo permission="invoices.pdf">
            <button type="button" onClick={(e) => { e.stopPropagation(); handlePdf(i.uid, i.reference) }}
              disabled={pdfLoading === i.uid}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40" title={t('invoices.download_pdf')}>
              {pdfLoading === i.uid ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <DocumentArrowDownIcon className="h-4 w-4" />
              )}
            </button>
          </CanDo>

          {i.status === 'draft' && (
            <CanDo permission="invoices.edit">
              <button type="button" onClick={(e) => { e.stopPropagation(); setSendTarget(i) }}
                className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title={t('common.send')}>
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </CanDo>
          )}

          {(i.status === 'draft' || i.status === 'sent') && (
            <CanDo permission="invoices.edit">
              <button type="button" onClick={(e) => { e.stopPropagation(); setCancelTarget(i) }}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title={t('common.cancel')}>
                <XCircleIcon className="h-4 w-4" />
              </button>
            </CanDo>
          )}

          {i.status === 'draft' && (
            <CanDo permission="invoices.delete">
              <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTarget(i) }}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title={t('common.delete')}>
                <TrashIcon className="h-4 w-4" />
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
        <h1 className="text-xl font-bold text-slate-900">{t('invoices.title')}</h1>
        <CanDo permission="invoices.create">
          <div className="relative">
            <div className="flex rounded-lg overflow-hidden ring-1 ring-brand-primary shadow-sm">
              <button type="button"
                onClick={() => navigate('/invoices/new')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-primary hover:opacity-90 transition">
                <PlusIcon className="h-4 w-4" />
                {t('invoices.new')}
              </button>
              <button type="button"
                onClick={() => setNewOpen((v) => !v)}
                className="px-2 py-2 text-white bg-brand-primary hover:opacity-90 transition border-l border-white/20">
                <ChevronDownIcon className="h-4 w-4" />
              </button>
            </div>
            {newOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white shadow-lg ring-1 ring-gray-200 z-10 py-1"
                onBlur={() => setNewOpen(false)}>
                <button type="button"
                  onClick={() => { navigate('/invoices/new'); setNewOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  📄 {t('invoices.new')}
                </button>
                <button type="button"
                  onClick={() => { navigate('/invoices/new?type=quote'); setNewOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  📋 {t('invoices.new_quote')}
                </button>
              </div>
            )}
          </div>
        </CanDo>
      </div>

      {/* Onglets Tous / Factures / Devis */}
      <div className="flex border-b border-gray-200">
        {([['' , t('invoices.filter_all')], ['invoice', t('invoices.type_invoice')], ['quote', t('invoices.type_quote')]] as [InvoiceType | '', string][]).map(([val, label]) => (
          <button key={val} type="button"
            onClick={() => { setDocType(val); setPage(1) }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              docType === val
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <Input placeholder={t('invoices.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">{t('invoices.filter_all')}</option>
            <option value="draft">{t('invoices.draft')}</option>
            <option value="sent">{docType === 'quote' ? t('invoices.quote_sent') : t('invoices.sent')}</option>
            <option value="paid">{docType === 'quote' ? t('invoices.quote_accepted') : t('invoices.paid')}</option>
            <option value="overdue">{docType === 'quote' ? t('invoices.quote_expired') : t('invoices.overdue')}</option>
            <option value="cancelled">{t('invoices.cancelled')}</option>
          </Select>
        </div>
        <div className="w-36">
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} title="Du" />
        </div>
        <div className="w-36">
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} title="Au" />
        </div>
      </div>

      <Table<Invoice>
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(i) => i.id}
        loading={isLoading}
        skeletonRows={8}
        emptyMessage={<EmptyState icon={<DocumentTextIcon className="h-7 w-7" />} title={t('invoices.empty_title')} description={t('invoices.empty_desc')} />}
        onRowClick={(i) => navigate(`/invoices/${i.uid}`)}
        mobileCard={(inv) => (
          <div className="px-4 py-4">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="font-mono text-sm font-semibold text-gray-900">{inv.reference}</span>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {inv.type === 'quote' && (
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">{t('invoices.type_quote')}</span>
                )}
                {inv.credit_note_for_id && (
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">{t('invoices.type_credit_note')}</span>
                )}
                <Badge variant={STATUS_VARIANT[inv.status]}>
                  {(SENT_LABEL[inv.type ?? 'invoice'] ?? STATUS_LABEL)[inv.status]}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-gray-600 truncate mb-1">{inv.customer?.name ?? '—'}</p>
            <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
              <span>{formatDate(inv.issue_date)}</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</span>
            </div>
            <div className="flex items-center gap-1 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => navigate(`/invoices/${inv.uid}`)}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-gray-500 hover:bg-gray-100">
                <EyeIcon className="h-3.5 w-3.5" /> {t('common.view')}
              </button>
              <CanDo permission="invoices.pdf">
                <button type="button" onClick={() => handlePdf(inv.uid, inv.reference)} disabled={pdfLoading === inv.uid}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                  {pdfLoading === inv.uid ? (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                  )} PDF
                </button>
              </CanDo>
              {inv.status === 'draft' && (
                <CanDo permission="invoices.edit">
                  <button type="button" onClick={() => setSendTarget(inv)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-blue-500 hover:bg-blue-50">
                    <PaperAirplaneIcon className="h-3.5 w-3.5" /> {t('common.send')}
                  </button>
                </CanDo>
              )}
            </div>
          </div>
        )}
      />

      {data && data.last_page > 1 && (
        <Pagination currentPage={data.current_page} lastPage={data.last_page} total={data.total} perPage={data.per_page} onPageChange={setPage} />
      )}

      {/* Modal envoyer */}
      <Modal isOpen={!!sendTarget} onClose={() => setSendTarget(null)} title={t('invoices.send_title')} size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setSendTarget(null)}>{t('common.cancel')}</Button>
          <Button loading={sendMutation.isPending} onClick={() => sendTarget && sendMutation.mutate(sendTarget.uid)}>
            {t('common.send')}
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          {t('invoices.send_confirm')} <span className="font-mono font-semibold text-gray-900">{sendTarget?.reference}</span> ?
        </p>
      </Modal>

      {/* Modal annuler */}
      <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title={t('invoices.cancel_title')} size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setCancelTarget(null)}>{t('common.back')}</Button>
          <Button variant="danger" loading={cancelMutation.isPending} onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.uid)}>
            {t('invoices.cancel_action')}
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          {t('invoices.cancel_confirm')} <span className="font-mono font-semibold text-gray-900">{cancelTarget?.reference}</span> ?
        </p>
      </Modal>

      {/* Modal supprimer */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('invoices.delete_title')} size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.uid)}>
            {t('common.delete')}
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          {t('invoices.delete_confirm')} <span className="font-mono font-semibold text-gray-900">{deleteTarget?.reference}</span> ?
        </p>
      </Modal>
    </div>
  )
}
