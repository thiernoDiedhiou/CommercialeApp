import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, EyeIcon, CheckIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import {
  getPurchaseOrders,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,
} from '@/services/api/purchases'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import { formatDate } from '@/lib/utils'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types'

const STATUS_VARIANT: Record<PurchaseOrderStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft:     'default',
  ordered:   'info',
  partial:   'warning',
  received:  'success',
  cancelled: 'danger',
}

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft:     'Brouillon',
  ordered:   'Commandé',
  partial:   'Partiel',
  received:  'Réceptionné',
  cancelled: 'Annulé',
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebSearch(search); setPage(1) }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // ── Données ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { search: debSearch, status, page }],
    queryFn: () => getPurchaseOrders({ search: debSearch || undefined, status: status || undefined, page }),
    placeholderData: (prev) => prev,
  })

  // ── Actions ───────────────────────────────────────────────────────────────
  const [confirmTarget, setConfirmTarget] = useState<PurchaseOrder | null>(null)
  const [cancelTarget, setCancelTarget]   = useState<PurchaseOrder | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<PurchaseOrder | null>(null)

  const confirmMutation = useMutation({
    mutationFn: (id: number) => confirmPurchaseOrder(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); setConfirmTarget(null) },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelPurchaseOrder(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); setCancelTarget(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePurchaseOrder(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); setDeleteTarget(null) },
  })

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'reference',
      header: 'Référence',
      render: (o) => <span className="font-mono text-sm font-semibold text-gray-900">{o.reference}</span>,
    },
    {
      key: 'supplier',
      header: 'Fournisseur',
      render: (o) => o.supplier
        ? <span className="text-sm text-gray-700">{o.supplier.name}</span>
        : <span className="text-sm text-gray-300">—</span>,
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (o) => <span className="text-sm text-gray-600">{formatDate(o.created_at)}</span>,
    },
    {
      key: 'expected_at',
      header: 'Livraison prévue',
      render: (o) => <span className="text-sm text-gray-600">{formatDate(o.expected_at)}</span>,
    },
    {
      key: 'items_count',
      header: 'Articles',
      align: 'center',
      render: (o) => <span className="text-sm text-gray-700">{o.items_count ?? 0}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      align: 'center',
      render: (o) => <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (o) => (
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/purchases/${o.id}`) }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Voir le détail">
            <EyeIcon className="h-4 w-4" />
          </button>

          {o.status === 'draft' && (
            <CanDo permission="purchases.edit">
              <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmTarget(o) }}
                className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Confirmer">
                <CheckIcon className="h-4 w-4" />
              </button>
            </CanDo>
          )}

          {(o.status === 'draft' || o.status === 'ordered') && (
            <CanDo permission="purchases.edit">
              <button type="button" onClick={(e) => { e.stopPropagation(); setCancelTarget(o) }}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Annuler">
                <XCircleIcon className="h-4 w-4" />
              </button>
            </CanDo>
          )}

          {o.status === 'draft' && (
            <CanDo permission="purchases.delete">
              <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTarget(o) }}
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
        <h1 className="text-xl font-bold text-gray-900">Bons de commande</h1>
        <CanDo permission="purchases.create">
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => navigate('/purchases/new')}>
            Nouveau bon
          </Button>
        </CanDo>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <Input placeholder="Rechercher une référence…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">Tous statuts</option>
            <option value="draft">Brouillon</option>
            <option value="ordered">Commandé</option>
            <option value="partial">Partiel</option>
            <option value="received">Réceptionné</option>
            <option value="cancelled">Annulé</option>
          </Select>
        </div>
      </div>

      <Table<PurchaseOrder>
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(o) => o.id}
        loading={isLoading}
        skeletonRows={8}
        emptyMessage="Aucun bon de commande trouvé."
        onRowClick={(o) => navigate(`/purchases/${o.id}`)}
      />

      {data && data.last_page > 1 && (
        <Pagination currentPage={data.current_page} lastPage={data.last_page} total={data.total} perPage={data.per_page} onPageChange={setPage} />
      )}

      {/* Modal confirmer */}
      <Modal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Confirmer la commande" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setConfirmTarget(null)}>Annuler</Button>
          <Button loading={confirmMutation.isPending} onClick={() => confirmTarget && confirmMutation.mutate(confirmTarget.id)}>
            Confirmer
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Confirmer le bon <span className="font-mono font-semibold text-gray-900">{confirmTarget?.reference}</span> ? Le statut passera à "Commandé".
        </p>
      </Modal>

      {/* Modal annuler */}
      <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Annuler le bon de commande" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setCancelTarget(null)}>Retour</Button>
          <Button variant="danger" loading={cancelMutation.isPending} onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}>
            Annuler le bon
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Voulez-vous annuler le bon <span className="font-mono font-semibold text-gray-900">{cancelTarget?.reference}</span> ? Aucun stock ne sera affecté.
        </p>
      </Modal>

      {/* Modal supprimer */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Supprimer le bon" size="sm"
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
