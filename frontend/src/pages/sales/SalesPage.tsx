import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { getSales, cancelSale, openSalePdf } from '@/services/api/sales'
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
import type { Sale } from '@/types'

const STATUS_VARIANT: Record<Sale['status'], 'success' | 'default' | 'danger'> = {
  confirmed: 'success',
  draft:     'default',
  cancelled: 'danger',
}
const STATUS_LABEL: Record<Sale['status'], string> = {
  confirmed: 'Confirmée',
  draft:     'Brouillon',
  cancelled: 'Annulée',
}

export default function SalesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

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
    mutationFn: (id: number) => cancelSale(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sale', id] })
      setCancelTarget(null)
    },
  })

  // ── PDF ───────────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState<number | null>(null)
  const handlePdf = async (id: number) => {
    setPdfLoading(id)
    try { await openSalePdf(id) } finally { setPdfLoading(null) }
  }

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns: Column<Sale>[] = [
    {
      key: 'reference',
      header: 'Référence',
      render: (s) => (
        <span className="font-mono text-sm font-semibold text-gray-900">{s.reference}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Client',
      render: (s) =>
        s.customer ? (
          <span className="text-sm text-gray-700">{s.customer.name}</span>
        ) : (
          <span className="text-sm text-gray-300">Anonyme</span>
        ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (s) => (
        <span className="text-sm text-gray-600">
          {formatDate(s.confirmed_at ?? s.created_at)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Montant',
      align: 'right',
      render: (s) => (
        <span className="font-medium text-gray-900">{formatCurrency(s.total)}</span>
      ),
    },
    {
      key: 'paid_amount',
      header: 'Payé',
      align: 'right',
      render: (s) => (
        <span className="text-sm font-medium text-emerald-600">{formatCurrency(s.paid_amount)}</span>
      ),
    },
    {
      key: 'due',
      header: 'Reste dû',
      align: 'right',
      render: (s) => {
        const due = parseFloat(s.total) - parseFloat(s.paid_amount)
        return due > 0 ? (
          <span className="font-semibold text-red-600">{formatCurrency(due)}</span>
        ) : (
          <span className="text-sm text-gray-300">—</span>
        )
      },
    },
    {
      key: 'status',
      header: 'Statut',
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
            onClick={(e) => { e.stopPropagation(); navigate(`/sales/${s.id}`) }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Voir le détail"
          >
            <EyeIcon className="h-4 w-4" />
          </button>

          {/* PDF */}
          <CanDo permission="sales.pdf">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handlePdf(s.id) }}
              disabled={pdfLoading === s.id}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
              title="Télécharger PDF"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
            </button>
          </CanDo>

          {/* Annuler — seulement si confirmed */}
          {s.status === 'confirmed' && (
            <CanDo permission="sales.delete">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setCancelTarget(s) }}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Annuler la vente"
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
        <h1 className="text-xl font-bold text-gray-900">Ventes</h1>
        <CanDo permission="sales.create">
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => navigate('/sales/new')}
          >
            Nouvelle vente
          </Button>
        </CanDo>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <Input
            placeholder="Référence ou client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">Tous statuts</option>
            <option value="confirmed">Confirmée</option>
            <option value="draft">Brouillon</option>
            <option value="cancelled">Annulée</option>
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
        emptyMessage="Aucune vente trouvée."
        onRowClick={(s) => navigate(`/sales/${s.id}`)}
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
        title="Annuler la vente"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Retour
            </Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
            >
              Confirmer l'annulation
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Voulez-vous annuler la vente{' '}
          <span className="font-mono font-semibold text-gray-900">{cancelTarget?.reference}</span> ?
          Le stock sera restitué automatiquement.
        </p>
      </Modal>
    </div>
  )
}
