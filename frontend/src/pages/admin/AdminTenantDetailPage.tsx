import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import {
  ArrowLeftIcon, BuildingStorefrontIcon, UsersIcon,
  NoSymbolIcon, CheckCircleIcon, TrashIcon,
} from '@heroicons/react/24/outline'
import {
  getAdminTenant, updateAdminTenant,
  suspendTenant, activateTenant, deleteAdminTenant,
} from '@/services/api/admin'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'

// ── Schema ────────────────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide').or(z.literal('')).optional()

const schema = z.object({
  name:            z.string().min(2, 'Nom requis'),
  sector:          z.enum(['general', 'food', 'fashion', 'cosmetic']),
  currency:        z.string().min(3).max(3),
  phone:           z.string().optional(),
  email:           z.string().email('Email invalide').or(z.literal('')).optional(),
  address:         z.string().optional(),
  city:            z.string().optional(),
  primary_color:   hexColor,
  secondary_color: hexColor,
})
type FormValues = z.infer<typeof schema>

const SECTOR_LABELS: Record<string, string> = {
  general: 'Commerce général', food: 'Alimentation',
  fashion: 'Mode', cosmetic: 'Cosmétique',
}

// ── Composants partagés ───────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 transition'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

function ColorField({ label, value, onChange, error }: {
  label: string; value: string; onChange: (h: string) => void; error?: string
}) {
  const safeHex = /^#[0-9A-Fa-f]{6}$/.test(value ?? '') ? value : '#374151'
  return (
    <Field label={label} error={error}>
      <div className="flex items-center gap-2">
        <input type="color" value={safeHex} onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-9 w-9 shrink-0 rounded-lg border border-gray-600 bg-transparent p-0.5 cursor-pointer" />
        <input value={value ?? ''} onChange={(e) => onChange(e.target.value)}
          className={inputCls} placeholder="#2563eb" />
      </div>
    </Field>
  )
}

// ── Page principale ────────────────────────────────────────────────────────

export default function AdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenant', id],
    queryFn: () => getAdminTenant(Number(id)),
  })

  const tenant = data?.data
  const users  = data?.users ?? []

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sector: 'general', currency: 'XOF' },
  })

  useEffect(() => {
    if (tenant) {
      reset({
        name:            tenant.name,
        sector:          tenant.sector as FormValues['sector'],
        currency:        tenant.currency,
        phone:           tenant.phone ?? '',
        email:           tenant.email ?? '',
        address:         tenant.address ?? '',
        city:            tenant.city ?? '',
        primary_color:   tenant.primary_color ?? '#4F46E5',
        secondary_color: tenant.secondary_color ?? '#7C3AED',
      })
    }
  }, [tenant, reset])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-tenant', id] })
    qc.invalidateQueries({ queryKey: ['admin-tenants'] })
  }

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => updateAdminTenant(Number(id), v),
    onSuccess: () => { invalidate(); toast.success('Tenant mis à jour.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const suspendMutation = useMutation({
    mutationFn: () => suspendTenant(Number(id)),
    onSuccess: () => { invalidate(); toast.success('Tenant suspendu.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const activateMutation = useMutation({
    mutationFn: () => activateTenant(Number(id)),
    onSuccess: () => { invalidate(); toast.success('Tenant activé.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminTenant(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenants'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Tenant supprimé.')
      navigate('/admin/tenants')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
        ))}
      </div>
    )
  }

  if (!tenant) {
    return <div className="p-6 text-sm text-gray-400">Tenant introuvable.</div>
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('/admin/tenants')}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name}
              className="h-14 w-14 rounded-xl object-contain bg-gray-800 p-1 border border-gray-700" />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-indigo-900/50 flex items-center justify-center text-2xl font-bold text-indigo-300 border border-gray-700">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{tenant.name}</h1>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                tenant.is_active
                  ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
                  : 'bg-red-900/50 text-red-400 border border-red-800'
              }`}>
                {tenant.is_active ? 'Actif' : 'Suspendu'}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5 font-mono">{tenant.slug}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {SECTOR_LABELS[tenant.sector] ?? tenant.sector} · {tenant.currency} · Créé le {tenant.created_at}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {tenant.is_active ? (
            <button type="button" onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-orange-700 px-3 py-2 text-sm text-orange-400 hover:bg-orange-900/20 disabled:opacity-50 transition">
              <NoSymbolIcon className="h-4 w-4" />
              Suspendre
            </button>
          ) : (
            <button type="button" onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-emerald-700 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-900/20 disabled:opacity-50 transition">
              <CheckCircleIcon className="h-4 w-4" />
              Activer
            </button>
          )}
          <button type="button"
            onClick={() => { if (confirm(`Supprimer définitivement "${tenant.name}" ?`)) deleteMutation.mutate() }}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 disabled:opacity-50 transition">
            <TrashIcon className="h-4 w-4" />
            Supprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Formulaire d'édition */}
        <div className="lg:col-span-3 rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <BuildingStorefrontIcon className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-white">Informations</h2>
          </div>

          <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
            <Field label="Nom *" error={errors.name?.message}>
              <input {...register('name')} className={inputCls} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Secteur">
                <select {...register('sector')} className={inputCls}>
                  <option value="general">Commerce général</option>
                  <option value="food">Alimentation</option>
                  <option value="fashion">Mode</option>
                  <option value="cosmetic">Cosmétique</option>
                </select>
              </Field>
              <Field label="Devise">
                <select {...register('currency')} className={inputCls}>
                  {['XOF', 'XAF', 'GNF', 'EUR', 'USD', 'GBP'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Téléphone">
                <input {...register('phone')} className={inputCls} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <input type="email" {...register('email')} className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Adresse">
                <input {...register('address')} className={inputCls} />
              </Field>
              <Field label="Ville">
                <input {...register('city')} className={inputCls} />
              </Field>
            </div>

            {/* Charte graphique */}
            <div className="pt-2 border-t border-gray-800 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Charte graphique</p>
              <div className="grid grid-cols-2 gap-3">
                <ColorField
                  label="Couleur primaire"
                  value={watch('primary_color') ?? ''}
                  onChange={(h) => setValue('primary_color', h, { shouldDirty: true })}
                  error={errors.primary_color?.message}
                />
                <ColorField
                  label="Couleur secondaire"
                  value={watch('secondary_color') ?? ''}
                  onChange={(h) => setValue('secondary_color', h, { shouldDirty: true })}
                  error={errors.secondary_color?.message}
                />
              </div>
              {/* Aperçu */}
              {(watch('primary_color') || watch('secondary_color')) && (
                <div className="flex items-center gap-3 rounded-lg bg-gray-800 px-3 py-2">
                  <span className="text-xs text-gray-400">Aperçu :</span>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded border border-gray-600"
                        style={{ backgroundColor: watch('primary_color') || '#4F46E5' }} />
                      <span className="text-xs text-gray-300">Primaire</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded border border-gray-600"
                        style={{ backgroundColor: watch('secondary_color') || '#7C3AED' }} />
                      <span className="text-xs text-gray-300">Secondaire</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={updateMutation.isPending || !isDirty}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition">
                {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>

        {/* Utilisateurs */}
        <div className="lg:col-span-2 rounded-xl bg-gray-900 border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-white">
              Utilisateurs
              <span className="ml-2 text-xs font-normal text-gray-500">({users.length})</span>
            </h2>
          </div>

          {users.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Aucun utilisateur.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.is_active
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {u.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
