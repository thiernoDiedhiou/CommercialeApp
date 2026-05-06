import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/services/api/customers'
import { normalizePhone } from '@/components/ui/PhoneInput'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import CustomerForm from '@/components/customers/CustomerForm'
import type { CustomerFormValues } from '@/components/customers/CustomerForm'
import type { Customer } from '@/types'

const FORM_ID = 'customer-form'

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; customer: Customer }
  | null

export default function CustomersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // ── Filtres ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isActive, setIsActive] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // ── Données ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search: debouncedSearch, isActive, page }],
    queryFn: () =>
      getCustomers({
        search: debouncedSearch || undefined,
        is_active: isActive === '' ? undefined : isActive === 'true',
        page,
      }),
    placeholderData: (prev) => prev,
  })

  // ── Modaux ────────────────────────────────────────────────────────────────
  const [modal, setModal]             = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Customer | null>(null)

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (values: CustomerFormValues) =>
      createCustomer({
        name:    values.name,
        country: values.country,
        phone:   normalizePhone(values.phone),
        email:   values.email   || null,
        address: values.address || null,
        notes:   values.notes   || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setModal(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: CustomerFormValues }) =>
      updateCustomer(id, {
        name:    values.name,
        country: values.country,
        phone:   normalizePhone(values.phone),
        email:   values.email   || null,
        address: values.address || null,
        notes:   values.notes   || null,
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer', id] })
      setModal(null)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (customer: Customer) =>
      updateCustomer(customer.id, { is_active: !customer.is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setToggleTarget(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setDeleteTarget(null)
    },
  })

  // ── Handlers formulaire ───────────────────────────────────────────────────
  const handleFormSubmit = (values: CustomerFormValues) => {
    if (modal?.mode === 'create') createMutation.mutate(values)
    else if (modal?.mode === 'edit') updateMutation.mutate({ id: modal.customer.id, values })
  }

  const isMutating = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.isError || updateMutation.isError

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Nom',
      render: (c) => (
        <span className="font-medium text-gray-900">{c.name}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Téléphone',
      render: (c) => (
        <span className={c.phone ? 'text-sm text-gray-700' : 'text-sm text-gray-300'}>
          {c.phone ?? '—'}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (c) => (
        <span className={c.email ? 'text-sm text-gray-700' : 'text-sm text-gray-300'}>
          {c.email ?? '—'}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Statut',
      align: 'center',
      render: (c) => (
        <Badge variant={c.is_active ? 'success' : 'default'}>
          {c.is_active ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {/* Voir */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/customers/${c.id}`) }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Voir le profil"
          >
            <EyeIcon className="h-4 w-4" />
          </button>

          {/* Modifier */}
          <CanDo permission="customers.edit">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setModal({ mode: 'edit', customer: c }) }}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Modifier"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          </CanDo>

          {/* Désactiver / Activer */}
          <CanDo permission="customers.edit">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setToggleTarget(c) }}
              className={`rounded p-1.5 transition-colors ${
                c.is_active
                  ? 'text-gray-400 hover:bg-orange-50 hover:text-orange-500'
                  : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
              }`}
              title={c.is_active ? 'Désactiver' : 'Activer'}
            >
              <NoSymbolIcon className="h-4 w-4" />
            </button>
          </CanDo>

          {/* Supprimer */}
          <CanDo permission="customers.delete">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(c) }}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="Supprimer"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </CanDo>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Clients</h1>
        <CanDo permission="customers.create">
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setModal({ mode: 'create' })}
          >
            Nouveau client
          </Button>
        </CanDo>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <Input
            placeholder="Rechercher un client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-36">
          <Select
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value as '' | 'true' | 'false')
              setPage(1)
            }}
          >
            <option value="">Tous statuts</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Table<Customer>
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(c) => c.id}
        loading={isLoading}
        skeletonRows={8}
        emptyMessage="Aucun client trouvé."
        onRowClick={(c) => navigate(`/customers/${c.id}`)}
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

      {/* Modal création / édition */}
      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Modifier le client' : 'Nouveau client'}
        size="md"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setModal(null)}>
              Annuler
            </Button>
            <Button form={FORM_ID} type="submit" loading={isMutating}>
              {modal?.mode === 'edit' ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        {mutationError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Une erreur est survenue. Veuillez réessayer.
          </p>
        )}
        <CustomerForm
          formId={FORM_ID}
          customer={modal?.mode === 'edit' ? modal.customer : null}
          onSubmit={handleFormSubmit}
        />
      </Modal>

      {/* Modal suppression */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le client"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Voulez-vous supprimer{' '}
          <span className="font-semibold text-gray-900">«{deleteTarget?.name}»</span> ?
          Cette action est irréversible.
        </p>
      </Modal>

      {/* Modal confirmation activation / désactivation */}
      <Modal
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        title={toggleTarget?.is_active ? 'Désactiver le client' : 'Activer le client'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setToggleTarget(null)}>
              Annuler
            </Button>
            <Button
              variant={toggleTarget?.is_active ? 'danger' : undefined}
              loading={toggleMutation.isPending}
              onClick={() => toggleTarget && toggleMutation.mutate(toggleTarget)}
            >
              {toggleTarget?.is_active ? 'Désactiver' : 'Activer'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Voulez-vous {toggleTarget?.is_active ? 'désactiver' : 'activer'} le client{' '}
          <span className="font-semibold text-gray-900">«{toggleTarget?.name}»</span> ?
          {toggleTarget?.is_active && (
            <span className="mt-1 block text-xs text-gray-400">
              Le client ne sera plus accessible depuis le POS.
            </span>
          )}
        </p>
      </Modal>
    </div>
  )
}
