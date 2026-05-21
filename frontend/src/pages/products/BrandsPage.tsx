import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getBrands, createBrand, updateBrand, deleteBrand } from '@/services/api/brands'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import type { Brand } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
})

type FormValues = z.infer<typeof schema>

const FORM_ID = 'brand-form'

type ModalState = { mode: 'create' } | { mode: 'edit'; brand: Brand } | null

export default function BrandsPage() {
  const qc = useQueryClient()
  const [modal, setModal]               = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn : getBrands,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver     : zodResolver(schema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (modal?.mode === 'edit') reset({ name: modal.brand.name })
    else if (modal?.mode === 'create') reset({ name: '' })
  }, [modal, reset])

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => createBrand({ name: v.name }),
    onSuccess : () => { qc.invalidateQueries({ queryKey: ['brands'] }); setModal(null); toast.success('Marque créée avec succès.') },
    onError   : (err) => toast.error(getApiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: number; v: FormValues }) => updateBrand(id, { name: v.name }),
    onSuccess : () => { qc.invalidateQueries({ queryKey: ['brands'] }); setModal(null); toast.success('Marque mise à jour.') },
    onError   : (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBrand(id),
    onSuccess : () => { qc.invalidateQueries({ queryKey: ['brands'] }); setDeleteTarget(null); toast.success('Marque supprimée.') },
    onError   : (err) => toast.error(getApiErrorMessage(err)),
  })

  const onSubmit = (v: FormValues) => {
    if (modal?.mode === 'create') createMutation.mutate(v)
    else if (modal?.mode === 'edit') updateMutation.mutate({ id: modal.brand.id, v })
  }

  const isMutating = createMutation.isPending || updateMutation.isPending

  const columns: Column<Brand>[] = [
    {
      key   : 'name',
      header: 'Nom',
      render: (b) => <span className="font-medium text-gray-900">{b.name}</span>,
    },
    {
      key   : 'actions',
      header: '',
      align : 'right',
      render: (b) => (
        <div className="flex items-center justify-end gap-1">
          <CanDo permission="products.edit">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setModal({ mode: 'edit', brand: b }) }}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Modifier"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          </CanDo>
          <CanDo permission="products.delete">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(b) }}
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Marques</h1>
        <CanDo permission="products.create">
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setModal({ mode: 'create' })}>
            Nouvelle marque
          </Button>
        </CanDo>
      </div>

      <Table<Brand>
        columns={columns}
        data={brands}
        keyExtractor={(b) => b.id}
        loading={isLoading}
        skeletonRows={5}
        emptyMessage="Aucune marque trouvée."
      />

      {/* ── Modal création / édition ── */}
      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Modifier la marque' : 'Nouvelle marque'}
        size="sm"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setModal(null)}>Annuler</Button>
            <Button form={FORM_ID} type="submit" loading={isMutating}>
              {modal?.mode === 'edit' ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input label="Nom" required error={errors.name?.message} {...register('name')} />
        </form>
      </Modal>

      {/* ── Modal suppression ── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer la marque"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
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
          Voulez-vous supprimer la marque{' '}
          <span className="font-semibold text-gray-900">«{deleteTarget?.name}»</span> ?
          Cette action est irréversible.
        </p>
      </Modal>
    </div>
  )
}
