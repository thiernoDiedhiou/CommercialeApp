import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PhotoIcon, XMarkIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { uploadProductImage, deleteProductImage, reorderProductImages } from '@/services/api/products'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from '@/store/toastStore'
import { cn } from '@/lib/utils'
import type { ProductImage } from '@/types'

const MAX_IMAGES = 10

interface Props {
  productUid: string
  images: ProductImage[]
  queryKey: unknown[]
  disabled?: boolean
}

export default function ProductImageGallery({ productUid, images, queryKey, disabled }: Props) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [draggingUid, setDraggingUid] = useState<string | null>(null)
  const [dragOverUid, setDragOverUid] = useState<string | null>(null)

  // ── Upload ──────────────────────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProductImage(productUid, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      toast.success('Image ajoutée.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const remaining = MAX_IMAGES - images.length
    files.slice(0, remaining).forEach((f) => uploadMutation.mutate(f))
    e.target.value = ''
  }

  // ── Suppression ─────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (imageUid: string) => deleteProductImage(productUid, imageUid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      toast.success('Image supprimée.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  // ── Drag & drop réordonnancement ────────────────────────────────────────

  const reorderMutation = useMutation({
    mutationFn: (uids: string[]) => reorderProductImages(productUid, uids),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handleDragStart = (uid: string) => setDraggingUid(uid)
  const handleDragOver  = (e: React.DragEvent, uid: string) => {
    e.preventDefault()
    if (uid !== draggingUid) setDragOverUid(uid)
  }
  const handleDrop = (e: React.DragEvent, targetUid: string) => {
    e.preventDefault()
    if (!draggingUid || draggingUid === targetUid) return
    const sorted = [...images]
    const fromIdx = sorted.findIndex((i) => i.uid === draggingUid)
    const toIdx   = sorted.findIndex((i) => i.uid === targetUid)
    const [moved] = sorted.splice(fromIdx, 1)
    sorted.splice(toIdx, 0, moved)
    reorderMutation.mutate(sorted.map((i) => i.uid))
    setDraggingUid(null)
    setDragOverUid(null)
  }
  const handleDragEnd = () => { setDraggingUid(null); setDragOverUid(null) }

  const isUploading = uploadMutation.isPending
  const canAdd = images.length < MAX_IMAGES && !disabled

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Images du produit
          <span className="ml-2 text-xs font-normal text-gray-400">
            {images.length}/{MAX_IMAGES}
          </span>
        </p>
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="text-xs text-brand-primary hover:underline disabled:opacity-50"
          >
            {isUploading ? 'Envoi…' : '+ Ajouter'}
          </button>
        )}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {images.map((img, i) => (
          <div
            key={img.uid}
            draggable={!disabled}
            onDragStart={() => handleDragStart(img.uid)}
            onDragOver={(e) => handleDragOver(e, img.uid)}
            onDrop={(e) => handleDrop(e, img.uid)}
            onDragEnd={handleDragEnd}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-xl border-2 bg-gray-50 dark:bg-gray-800 transition-all',
              i === 0
                ? 'border-brand-primary/50'
                : 'border-gray-200 dark:border-gray-700',
              dragOverUid === img.uid && 'border-brand-primary scale-105',
              draggingUid === img.uid && 'opacity-40',
            )}
          >
            <img
              src={img.url}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />

            {/* Badge Principale */}
            {i === 0 && (
              <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-md bg-brand-primary/90 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                <StarSolid className="h-2.5 w-2.5" />
                Photo principale
              </span>
            )}

            {/* Actions au survol */}
            {!disabled && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  title="Glisser pour réordonner"
                  className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm hover:bg-white/40"
                >
                  <ArrowsUpDownIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(img.uid)}
                  disabled={deleteMutation.isPending}
                  title="Supprimer"
                  className="rounded-lg bg-red-500/80 p-1.5 text-white backdrop-blur-sm hover:bg-red-600 disabled:opacity-50"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Bouton ajout si place disponible */}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-xs text-gray-400 transition',
              'border-gray-200 hover:border-brand-primary hover:text-brand-primary dark:border-gray-700',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <PhotoIcon className="h-6 w-6" />
            <span>Ajouter</span>
          </button>
        )}
      </div>

      {images.length > 1 && (
        <p className="text-xs text-gray-400">
          Glissez les images pour changer l'ordre. La première image est l'image principale.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
