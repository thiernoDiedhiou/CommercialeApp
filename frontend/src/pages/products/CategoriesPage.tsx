import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/services/api/categories'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input, { Textarea } from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import Badge from '@/components/ui/Badge'
import type { Category } from '@/types'

const schema = z.object({
  name       : z.string().min(1, 'Le nom est requis').max(100, 'Maximum 100 caractères'),
  parent_id  : z.string().optional(),
  description: z.string().max(1000).optional(),
})

type FormValues = z.infer<typeof schema>

const FORM_ID = 'category-form'

interface FlatCategory extends Category {
  depth      : number
  parentName?: string
}

function flatten(cats: Category[], depth = 0, parentName?: string): FlatCategory[] {
  return cats.flatMap((c) => [
    { ...c, depth, parentName },
    ...(c.children ? flatten(c.children, depth + 1, c.name) : []),
  ])
}

type ModalState = { mode: 'create' } | { mode: 'edit'; category: FlatCategory } | null

export default function CategoriesPage() {
  const qc = useQueryClient()
  const [modal, setModal]               = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<FlatCategory | null>(null)

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn : getCategories,
  })

  const flatCategories = flatten(rawData)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver     : zodResolver(schema),
    defaultValues: { name: '', parent_id: '', description: '' },
  })

  useEffect(() => {
    if (modal?.mode === 'edit') {
      reset({
        name       : modal.category.name,
        parent_id  : modal.category.parent_id?.toString() ?? '',
        description: modal.category.description ?? '',
      })
    } else if (modal?.mode === 'create') {
      reset({ name: '', parent_id: '', description: '' })
    }
  }, [modal, reset])

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => createCategory({
      name       : v.name,
      parent_id  : v.parent_id ? Number(v.parent_id) : null,
      description: v.description || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setModal(null); toast.success('Catégorie créée avec succès.') },
    onError  : (err) => toast.error(getApiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: number; v: FormValues }) => updateCategory(id, {
      name       : v.name,
      parent_id  : v.parent_id ? Number(v.parent_id) : null,
      description: v.description || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setModal(null); toast.success('Catégorie mise à jour.') },
    onError  : (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess : () => { qc.invalidateQueries({ queryKey: ['categories'] }); setDeleteTarget(null); toast.success('Catégorie supprimée.') },
    onError   : (err) => toast.error(getApiErrorMessage(err)),
  })

  const onSubmit = (v: FormValues) => {
    if (modal?.mode === 'create') createMutation.mutate(v)
    else if (modal?.mode === 'edit') updateMutation.mutate({ id: modal.category.id, v })
  }

  const isMutating = createMutation.isPending || updateMutation.isPending

  // Seules les catégories racines sont proposées comme parent (évite les niveaux infinis)
  const availableParents = rawData.filter(
    (c) => modal?.mode !== 'edit' || c.id !== modal.category.id,
  )

  const columns: Column<FlatCategory>[] = [
    {
      key   : 'name',
      header: 'Nom',
      render: (c) => (
        <div className="flex items-center gap-1" style={{ paddingLeft: `${c.depth * 20}px` }}>
          {c.depth > 0 && <span className="text-gray-300 text-xs select-none">└</span>}
          <span className="font-medium text-gray-900">{c.name}</span>
        </div>
      ),
    },
    {
      key   : 'description',
      header: 'Description',
      render: (c) => (
        <span className="text-sm text-gray-500 line-clamp-1">{c.description ?? '—'}</span>
      ),
    },
    {
      key   : 'products_count',
      header: 'Produits',
      align : 'center',
      render: (c) => (
        <Badge variant={(c.products_count ?? 0) > 0 ? 'info' : 'default'}>
          {c.products_count ?? 0}
        </Badge>
      ),
    },
    {
      key   : 'actions',
      header: '',
      align : 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <CanDo permission="categories.edit">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setModal({ mode: 'edit', category: c }) }}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Modifier"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          </CanDo>
          <CanDo permission="categories.delete">
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Catégories</h1>
        <CanDo permission="categories.create">
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setModal({ mode: 'create' })}>
            Nouvelle catégorie
          </Button>
        </CanDo>
      </div>

      <Table<FlatCategory>
        columns={columns}
        data={flatCategories}
        keyExtractor={(c) => c.id}
        loading={isLoading}
        skeletonRows={6}
        emptyMessage="Aucune catégorie trouvée."
      />

      {/* ── Modal création / édition ── */}
      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie parente
            </label>
            <select
              {...register('parent_id')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">— Aucune (catégorie racine) —</option>
              {availableParents.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <Textarea label="Description" {...register('description')} />
        </form>
      </Modal>

      {/* ── Modal suppression ── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer la catégorie"
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
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Voulez-vous supprimer la catégorie{' '}
            <span className="font-semibold text-gray-900">«{deleteTarget?.name}»</span> ?
          </p>
          {(deleteTarget?.products_count ?? 0) > 0 && (
            <p className="text-amber-600">
              Cette catégorie contient {deleteTarget?.products_count} produit(s).
              Veuillez d'abord déplacer ou supprimer ces produits.
            </p>
          )}
          {(deleteTarget?.children?.length ?? 0) > 0 && (
            <p className="text-blue-600">
              Les sous-catégories seront remontées au niveau racine.
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
