import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilSquareIcon, TrashIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/services/api/suppliers'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import type { Supplier } from '@/types'

const schema = z.object({
  name:    z.string().min(1, 'Le nom est requis').max(200),
  phone:   z.string().optional(),
  email:   z.union([z.literal(''), z.string().email('Email invalide')]).optional(),
  address: z.string().optional(),
  notes:   z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const FORM_ID = 'supplier-form'

type ModalState = { mode: 'create' } | { mode: 'edit'; supplier: Supplier } | null

export default function SuppliersPage() {
  const qc = useQueryClient()

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // ── Données ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { search: debouncedSearch, page }],
    queryFn: () => getSuppliers({ search: debouncedSearch || undefined, page }),
    placeholderData: (prev) => prev,
  })

  // ── Modaux ────────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)

  // ── Formulaire ────────────────────────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (modal?.mode === 'edit') {
      reset({
        name:    modal.supplier.name,
        phone:   modal.supplier.phone ?? '',
        email:   modal.supplier.email ?? '',
        address: modal.supplier.address ?? '',
        notes:   modal.supplier.notes ?? '',
      })
    } else if (modal?.mode === 'create') {
      reset({ name: '', phone: '', email: '', address: '', notes: '' })
    }
  }, [modal, reset])

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (v: FormValues) => createSupplier({
      name: v.name,
      phone: v.phone || null,
      email: v.email || null,
      address: v.address || null,
      notes: v.notes || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setModal(null) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: number; v: FormValues }) => updateSupplier(id, {
      name: v.name,
      phone: v.phone || null,
      email: v.email || null,
      address: v.address || null,
      notes: v.notes || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setModal(null) },
  })

  const toggleMutation = useMutation({
    mutationFn: (s: Supplier) => updateSupplier(s.id, { is_active: !s.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSupplier(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setDeleteTarget(null) },
  })

  const onSubmit = (v: FormValues) => {
    if (modal?.mode === 'create') createMutation.mutate(v)
    else if (modal?.mode === 'edit') updateMutation.mutate({ id: modal.supplier.id, v })
  }

  const isMutating = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.isError || updateMutation.isError

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Nom',
      render: (s) => <span className="font-medium text-gray-900">{s.name}</span>,
    },
    {
      key: 'phone',
      header: 'Téléphone',
      render: (s) => <span className={s.phone ? 'text-sm text-gray-700' : 'text-sm text-gray-300'}>{s.phone ?? '—'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (s) => <span className={s.email ? 'text-sm text-gray-700' : 'text-sm text-gray-300'}>{s.email ?? '—'}</span>,
    },
    {
      key: 'is_active',
      header: 'Statut',
      align: 'center',
      render: (s) => (
        <Badge variant={s.is_active ? 'success' : 'default'}>
          {s.is_active ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <CanDo permission="suppliers.edit">
            <button type="button" onClick={(e) => { e.stopPropagation(); setModal({ mode: 'edit', supplier: s }) }}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Modifier">
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          </CanDo>
          <CanDo permission="suppliers.edit">
            <button type="button" onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(s) }}
              className={`rounded p-1.5 transition-colors ${s.is_active ? 'text-gray-400 hover:bg-orange-50 hover:text-orange-500' : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
              title={s.is_active ? 'Désactiver' : 'Activer'}>
              <NoSymbolIcon className="h-4 w-4" />
            </button>
          </CanDo>
          <CanDo permission="suppliers.delete">
            <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTarget(s) }}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Supprimer">
              <TrashIcon className="h-4 w-4" />
            </button>
          </CanDo>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Fournisseurs</h1>
        <CanDo permission="suppliers.create">
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setModal({ mode: 'create' })}>
            Nouveau fournisseur
          </Button>
        </CanDo>
      </div>

      <div className="max-w-xs">
        <Input placeholder="Rechercher un fournisseur…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Table<Supplier>
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(s) => s.id}
        loading={isLoading}
        skeletonRows={8}
        emptyMessage="Aucun fournisseur trouvé."
      />

      {data && data.last_page > 1 && (
        <Pagination currentPage={data.current_page} lastPage={data.last_page} total={data.total} perPage={data.per_page} onPageChange={setPage} />
      )}

      {/* Modal création / édition */}
      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        size="md"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setModal(null)}>Annuler</Button>
            <Button form={FORM_ID} type="submit" loading={isMutating}>
              {modal?.mode === 'edit' ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        {mutationError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">Une erreur est survenue. Veuillez réessayer.</p>
        )}
        <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input label="Nom *" error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Téléphone" {...register('phone')} />
            <Input label="Email" type="email" {...register('email')} />
          </div>
          <Textarea label="Adresse" {...register('address')} />
          <Textarea label="Notes" {...register('notes')} />
        </form>
      </Modal>

      {/* Modal suppression */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le fournisseur"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Voulez-vous supprimer <span className="font-semibold text-gray-900">«{deleteTarget?.name}»</span> ? Cette action est irréversible.
        </p>
      </Modal>
    </div>
  )
}
