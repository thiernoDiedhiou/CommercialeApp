import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { getProduct, createProduct, updateProduct, createVariant, deleteProduct } from '@/services/api/products'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from '@/store/toastStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import CategorySelect from '@/components/products/CategorySelect'
import BrandSelect from '@/components/products/BrandSelect'
import VariantManager from '@/components/products/VariantManager'
import type { CreateVariantData } from '@/types'

// ── Schema Zod ────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, 'Au moins 2 caractères'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.number().nullable().optional(),
  price: z
    .number({ invalid_type_error: 'Prix requis' })
    .positive('Le prix doit être supérieur à 0'),
  cost_price: z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v) ? null : v),
    z.number().min(0).nullable().optional(),
  ),
  unit: z.string().optional(),
  alert_threshold: z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v) ? null : v),
    z.number().min(0).nullable().optional(),
  ),
  brand_id: z.number().nullable().optional(),
  has_variants: z.boolean().default(false),
  is_weight_based: z.boolean().default(false),
  has_expiry: z.boolean().default(false),
  description: z.string().optional(),
  variants: z
    .array(
      z.object({
        attribute_value_ids: z.array(z.number()),
        sku: z.string().nullable().optional(),
        price: z.number().nullable().optional(),
      }),
    )
    .optional(),
})

type FormValues = z.infer<typeof schema>

// ── Toggle switch ─────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <div
          className={`h-5 w-9 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-brand-primary peer-focus:ring-offset-2 peer-disabled:opacity-50 ${
            checked ? 'bg-brand-primary' : 'bg-gray-300'
          }`}
        />
        <span
          className={`pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    </label>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

// ── Image Upload ───────────────────────────────────────────────────────────

function ImageUpload({
  preview,
  onFileChange,
  onRemove,
}: {
  preview: string | null
  onFileChange: (file: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileChange(file)
  }

  if (preview) {
    return (
      <div className="relative inline-block">
        <img
          src={preview}
          alt="Aperçu produit"
          className="h-32 w-32 rounded-lg object-cover ring-1 ring-gray-200"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
          aria-label="Supprimer l'image"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 block w-32 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-center text-xs text-gray-600 hover:bg-gray-50"
        >
          Changer
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Changer l'image produit"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-brand-primary hover:text-brand-primary"
        aria-label="Ajouter une image produit"
      >
        <PhotoIcon className="h-8 w-8" aria-hidden="true" />
        <span className="text-xs font-medium">Ajouter une image</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Sélectionner une image produit"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  )
}

// ── Page principale ────────────────────────────────────────────────────────

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Image state (géré hors React Hook Form car File n'est pas sérialisable)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(Number(id)),
    enabled: isEdit,
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      has_variants: false,
      is_weight_based: false,
      has_expiry: false,
    },
  })

  // Préremplissage en mode édition
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        category_id: product.category_id,
        price: Number(product.price),
        cost_price: product.cost_price ? Number(product.cost_price) : null,
        unit: product.unit ?? '',
        brand_id: product.brand_id ?? null,
        alert_threshold: product.alert_threshold ?? null,
        has_variants: product.has_variants,
        is_weight_based: product.is_weight_based,
        has_expiry: product.has_expiry,
        description: product.description ?? '',
      })
      setImagePreview(product.image_url ?? null)
    }
  }, [product, reset])

  const hasVariants = watch('has_variants')
  const price = watch('price') ?? 0
  const sku = watch('sku') ?? ''

  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 Mo

  const handleFileChange = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setImageError('Format non supporté. Utilisez JPEG, PNG ou WebP.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setImageError('Image trop lourde. Maximum 2 Mo.')
      return
    }
    setImageError(null)
    setImageFile(file)
    setRemoveImage(false)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageError(null)
    setRemoveImage(true)
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { variants, ...productData } = values
      const created = await createProduct(productData, imageFile)
      if (created.has_variants && variants?.length) {
        // allSettled : tente toutes les variantes avant de décider du rollback
        const results = await Promise.allSettled(
          variants.map((v) => createVariant(created.id, v as CreateVariantData)),
        )
        const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        if (failures.length > 0) {
          // Rollback complet — cascade supprime les variantes déjà créées
          await deleteProduct(created.id).catch(() => {})
          // Agrège tous les messages pour que l'utilisateur voie tous les conflits d'un coup
          const messages = failures.map((f) => getApiErrorMessage(f.reason))
          const unique = [...new Set(messages)]
          throw new Error(unique.join('\n'))
        }
      }
      return created
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produit créé avec succès.')
      navigate('/products')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const { variants: _variants, has_variants: _hv, ...rest } = values
      return updateProduct(Number(id), rest, imageFile, removeImage)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product', id] })
      toast.success('Produit mis à jour.')
      navigate('/products')
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.error || updateMutation.error

  const onSubmit = (values: FormValues) => {
    if (imageError) return
    if (isEdit) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  if (isEdit && productLoading) {
    return (
      <div className="p-6 text-sm text-gray-400">Chargement du produit…</div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">
            Les champs marqués <span className="text-red-500">*</span> sont obligatoires
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Section : Informations de base */}
        <Section title="Informations de base">
          {/* Image */}
          <div className="flex items-start gap-5">
            <div>
              <ImageUpload
                preview={imagePreview}
                onFileChange={handleFileChange}
                onRemove={handleRemoveImage}
              />
              {imageError && (
                <p className="mt-1.5 w-32 text-xs text-red-500 leading-snug">{imageError}</p>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <Input
                label="Nom du produit"
                placeholder="Ex : T-shirt coton"
                error={errors.name?.message}
                required
                {...register('name')}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SKU"
                  placeholder="TSH-001"
                  error={errors.sku?.message}
                  {...register('sku')}
                />
                <Input
                  label="Code-barres"
                  placeholder="3012345678901"
                  error={errors.barcode?.message}
                  {...register('barcode')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => (
                    <CategorySelect
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.category_id?.message}
                    />
                  )}
                />
                <Controller
                  name="brand_id"
                  control={control}
                  render={({ field }) => (
                    <BrandSelect
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.brand_id?.message}
                    />
                  )}
                />
              </div>
            </div>
          </div>
          <Textarea
            label="Description"
            placeholder="Description optionnelle…"
            {...register('description')}
          />
        </Section>

        {/* Section : Prix et stock */}
        <Section title="Prix et stock">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Prix de vente (FCFA)"
              type="number"
              min={0}
              placeholder="0"
              error={errors.price?.message}
              required
              {...register('price', { valueAsNumber: true })}
            />
            <Input
              label="Prix d'achat (FCFA)"
              type="number"
              min={0}
              placeholder="0"
              error={errors.cost_price?.message}
              {...register('cost_price', { valueAsNumber: true })}
            />
            <Input
              label="Unité"
              placeholder="pièce, kg, L…"
              {...register('unit')}
            />
            <Input
              label="Seuil d'alerte stock"
              type="number"
              min={0}
              placeholder="5"
              error={errors.alert_threshold?.message}
              {...register('alert_threshold', { valueAsNumber: true })}
            />
          </div>
        </Section>

        {/* Section : Options */}
        <Section title="Options">
          <div className="space-y-3">
            <Controller
              name="has_variants"
              control={control}
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="Produit à variantes"
                  hint="Couleur, taille, format…"
                  disabled={isEdit}
                />
              )}
            />
            <Controller
              name="is_weight_based"
              control={control}
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="Vendu au poids"
                  hint="Quantité en kilogrammes"
                />
              )}
            />
            <Controller
              name="has_expiry"
              control={control}
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="Gestion par lots / expiration"
                  hint="Dates de péremption, numéros de lot"
                />
              )}
            />
          </div>
        </Section>

        {/* Section : Variantes (création uniquement) */}
        {hasVariants && !isEdit && (
          <Section title="Variantes">
            <VariantManager
              productPrice={price}
              productSku={sku}
              onChange={(variants) => setValue('variants', variants)}
            />
          </Section>
        )}

        {/* Erreur globale */}
        {mutationError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 whitespace-pre-wrap">
            {getApiErrorMessage(mutationError)}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
          >
            Annuler
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? 'Enregistrer' : 'Créer le produit'}
          </Button>
        </div>
      </form>
    </div>
  )
}
