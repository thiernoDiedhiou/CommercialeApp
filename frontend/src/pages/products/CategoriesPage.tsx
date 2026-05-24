import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilSquareIcon, TrashIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
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

// ── Sous-composant upload image ───────────────────────────────────────────────
interface ImagePickerProps {
  currentUrl : string | null
  onChange   : (file: File | null) => void
  onRemove   : () => void
}

function ImagePicker({ currentUrl, onChange, onRemove }: ImagePickerProps) {
  const inputRef            = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl)

  useEffect(() => {
    setPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return currentUrl
    })
  }, [currentUrl])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    // Bug #2 fix : révoquer l'ancienne blob URL avant d'en créer une nouvelle
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
    onChange(file)
  }

  const handleRemove = () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    setPreview(null)
    onChange(null)
    onRemove()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Aperçu"
            className="h-20 w-20 rounded-xl object-cover border border-gray-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Supprimer l'image"
            className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 text-white p-0.5 shadow"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          <PhotoIcon className="h-5 w-5" />
          Ajouter une image
        </button>
      )}
      {preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1.5 block text-xs text-brand-primary hover:underline"
        >
          Changer l'image
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Choisir une image pour la catégorie"
        className="sr-only"
        onChange={handleFile}
      />
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const qc = useQueryClient()
  const [modal, setModal]               = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<FlatCategory | null>(null)
  const [imageFile, setImageFile]       = useState<File | null>(null)
  const [removeImage, setRemoveImage]   = useState(false)

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
    setImageFile(null)
    setRemoveImage(false)
  }, [modal, reset])

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => createCategory({
      name       : v.name,
      parent_id  : v.parent_id ? Number(v.parent_id) : null,
      description: v.description || null,
      image      : imageFile,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setModal(null); toast.success('Catégorie créée avec succès.') },
    onError  : (err) => toast.error(getApiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: number; v: FormValues }) => updateCategory(id, {
      name        : v.name,
      parent_id   : v.parent_id ? Number(v.parent_id) : null,
      description : v.description || null,
      image       : imageFile,
      remove_image: removeImage,
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

  const availableParents = rawData.filter(
    (c) => modal?.mode !== 'edit' || c.id !== modal.category.id,
  )

  const columns: Column<FlatCategory>[] = [
    {
      key   : 'name',
      header: 'Nom',
      render: (c) => (
        <div className={`flex items-center gap-3${c.depth > 0 ? ' pl-5' : ''}`}>
          {c.depth > 0 && <span className="text-gray-300 text-xs select-none">└</span>}
          {c.image_url ? (
            <img
              src={c.image_url}
              alt={c.name}
              className="h-8 w-8 rounded-lg object-cover shrink-0 border border-gray-100"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-gray-400">{c.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
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

          <ImagePicker
            currentUrl={modal?.mode === 'edit' ? modal.category.image_url : null}
            onChange={(file) => setImageFile(file)}
            onRemove={() => setRemoveImage(true)}
          />
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
