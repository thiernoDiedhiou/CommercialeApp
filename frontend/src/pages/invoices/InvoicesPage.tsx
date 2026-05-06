import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon, EyeIcon, DocumentArrowDownIcon,
  PaperAirplaneIcon, XCircleIcon, TrashIcon,
} from '@heroicons/react/24/outline'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, InvoiceStatus } from '@/types'

const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'info' | 'success' | 'danger' | 'warning'> = {
  draft:     'default',
  sent:      'info',
  paid:      'success',
  overdue:   'danger',
  cancelled: 'default',
}
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft:     'Brouillon',
  sent:      'Envoyée',
  paid:      'Payée',
  overdue:   'En retard',
  cancelled: 'Annulée',
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [search, setSearch]   = useState('')
  const [debSearch, setDeb]   = useState('')
  const [status, setStatus]   = useState('')
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [page, setPage]       = useState(1)

  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => { setDeb(search); setPage(1) }, 300)
    return () => { if (debRef.current) clearTimeout(debRef.current) }
  }, [search])

  // ── Données ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { search: debSearch, status, from, to, page }],
    queryFn: () => getInvoices({
      search: debSearch || undefined,
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
    }),
    placeholderData: (prev) => prev,
  })

  // ── Actions ───────────────────────────────────────────────────────────────
  const [sendTarget, setSendTarget]     = useState<Invoice | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [pdfLoading, setPdfLoading]     = useState<number | null>(null)

  const sendMutation = useMutation({
    mutationFn: (id: number) => sendInvoice(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setSendTarget(null); toast.success('Facture marquée comme envoyée.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelInvoice(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setCancelTarget(null); toast.success('Facture annulée.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInvoice(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setDeleteTarget(null); toast.success('Facture supprimée.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handlePdf = async (id: number, reference: string) => {
    setPdfLoading(id)
    try { await openInvoicePdf(id, reference) } finally { setPdfLoading(null) }
  }

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns: Column<Invoice>[] = [
    {
      key: 'reference',
      header: 'Référence',
      render: (i) => <span className="font-mono text-sm font-semibold text-gray-900">{i.reference}</span>,
    },
    {
      key: 'customer',
      header: 'Client',
      render: (i) => i.customer
        ? <span className="text-sm text-gray-700">{i.customer.name}</span>
        : <span className="text-sm text-gray-300">—</span>,
    },
    {
      key: 'issue_date',
      header: 'Émission',
      render: (i) => <span className="text-sm text-gray-600">{formatDate(i.issue_date)}</span>,
    },
    {
      key: 'due_date',
      header: 'Échéance',
      render: (i) => (
        <span className={`text-sm ${i.status === 'overdue' ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
          {formatDate(i.due_date)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Montant',
      align: 'right',
      render: (i) => <span className="font-medium text-gray-900">{formatCurrency(i.total)}</span>,
    },
    {
      key: 'paid_amount',
      header: 'Encaissé',
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
      header: 'Statut',
      align: 'center',
      render: (i) => <Badge variant={STATUS_VARIANT[i.status]}>{STATUS_LABEL[i.status]}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) => (
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${i.id}`) }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Voir">
            <EyeIcon className="h-4 w-4" />
          </button>

          <CanDo permission="invoices.pdf">
            <button type="button" onClick={(e) => { e.stopPropagation(); handlePdf(i.id, i.reference) }}
              disabled={pdfLoading === i.id}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40" title="PDF">
              <DocumentArrowDownIcon className="h-4 w-4" />
            </button>
          </CanDo>

          {i.status === 'draft' && (
            <CanDo permission="invoices.edit">
              <button type="button" onClick={(e) => { e.stopPropagation(); setSendTarget(i) }}
                className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Envoyer">
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </CanDo>
          )}

          {(i.status === 'draft' || i.status === 'sent') && (
            <CanDo permission="invoices.edit">
              <button type="button" onClick={(e) => { e.stopPropagation(); setCancelTarget(i) }}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Annuler">
                <XCircleIcon className="h-4 w-4" />
              </button>
            </CanDo>
          )}

          {i.status === 'draft' && (
            <CanDo permission="invoices.delete">
              <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTarget(i) }}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Supprimer">
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Factures</h1>
        <CanDo permission="invoices.create">
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => navigate('/invoices/new')}>
            Nouvelle facture
          </Button>
        </CanDo>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <Input placeholder="Référence…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">Tous statuts</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyée</option>
            <option value="paid">Payée</option>
            <option value="overdue">En retard</option>
            <option value="cancelled">Annulée</option>
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
        emptyMessage="Aucune facture trouvée."
        onRowClick={(i) => navigate(`/invoices/${i.id}`)}
      />

      {data && data.last_page > 1 && (
        <Pagination currentPage={data.current_page} lastPage={data.last_page} total={data.total} perPage={data.per_page} onPageChange={setPage} />
      )}

      {/* Modal envoyer */}
      <Modal isOpen={!!sendTarget} onClose={() => setSendTarget(null)} title="Envoyer la facture" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setSendTarget(null)}>Annuler</Button>
          <Button loading={sendMutation.isPending} onClick={() => sendTarget && sendMutation.mutate(sendTarget.id)}>
            Envoyer
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Passer la facture <span className="font-mono font-semibold text-gray-900">{sendTarget?.reference}</span> en statut "Envoyée" ?
        </p>
      </Modal>

      {/* Modal annuler */}
      <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Annuler la facture" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setCancelTarget(null)}>Retour</Button>
          <Button variant="danger" loading={cancelMutation.isPending} onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}>
            Annuler la facture
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Voulez-vous annuler <span className="font-mono font-semibold text-gray-900">{cancelTarget?.reference}</span> ?
        </p>
      </Modal>

      {/* Modal supprimer */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Supprimer la facture" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
            Supprimer
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Supprimer définitivement <span className="font-mono font-semibold text-gray-900">{deleteTarget?.reference}</span> ?
        </p>
      </Modal>
    </div>
  )
}
