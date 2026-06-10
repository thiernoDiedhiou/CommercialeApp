import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusIcon, PencilSquareIcon, TrashIcon, NoSymbolIcon, CheckCircleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import {
  getAdminTenants, createAdminTenant, updateAdminTenant,
  suspendTenant, activateTenant, deleteAdminTenant,
  getAdminPlans,
} from '@/services/api/admin'
import type { AdminTenant } from '@/services/api/admin'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────

const SUB_STATUS_COLOR: Record<string, string> = {
  trial:     'bg-blue-900/50 text-blue-300',
  active:    'bg-emerald-900/50 text-emerald-400',
  expired:   'bg-red-900/50 text-red-400',
  cancelled: 'bg-gray-800 text-gray-500',
}
const SUB_STATUS_LABEL: Record<string, string> = {
  trial:     'Essai',
  active:    'Actif',
  expired:   'Expiré',
  cancelled: 'Annulé',
}

const SECTOR_LABELS: Record<string, string> = {
  general:  'Commerce général',
  food:     'Alimentation',
  fashion:  'Mode',
  cosmetic: 'Cosmétique',
}

// ── Schemas ───────────────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide').or(z.literal('')).optional()

const createSchema = z.object({
  name:            z.string().min(2, 'Nom requis'),
  sector:          z.enum(['general', 'food', 'fashion', 'cosmetic']),
  currency:        z.string().min(3).max(3),
  phone:           z.string().optional(),
  email:           z.string().email('Email invalide').or(z.literal('')).optional(),
  address:         z.string().optional(),
  city:            z.string().optional(),
  primary_color:   hexColor,
  secondary_color: hexColor,
  admin_name:      z.string().min(2, 'Nom admin requis'),
  admin_email:     z.string().email('Email admin invalide'),
  admin_password:  z.string().min(8, '8 caractères minimum'),
})
type CreateValues = z.infer<typeof createSchema>

const editSchema = z.object({
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
type EditValues = z.infer<typeof editSchema>

// ── Composant principal ───────────────────────────────────────────────────

export default function AdminTenantsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [search, setSearch]           = useState('')
  const [debouncedSearch, setDeb]     = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'true' | 'false'>('')
  const [planFilter, setPlanFilter]   = useState<number | ''>('')
  const [page, setPage]               = useState(1)
  const [createOpen, setCreateOpen]         = useState(false)
  const [editTarget, setEditTarget]         = useState<AdminTenant | null>(null)
  const [deleteTarget, setDeleteTarget]     = useState<AdminTenant | null>(null)
  const [suspendTarget, setSuspendTarget]   = useState<AdminTenant | null>(null)

  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => { setDeb(search); setPage(1) }, 300)
    return () => { if (debRef.current) clearTimeout(debRef.current) }
  }, [search])

  const { data: plans = [] } = useQuery({
    queryKey: ['admin-plans'],
    queryFn:  getAdminPlans,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants', { search: debouncedSearch, statusFilter, planFilter, page }],
    queryFn: () => getAdminTenants({
      search:    debouncedSearch || undefined,
      is_active: statusFilter === '' ? undefined : statusFilter === 'true',
      plan_id:   planFilter || undefined,
      page,
    }),
    placeholderData: (prev) => prev,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-tenants'] })

  const createMutation = useMutation({
    mutationFn: createAdminTenant,
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['admin-stats'] }); setCreateOpen(false); toast.success('Tenant créé avec succès.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditValues }) => updateAdminTenant(id, data),
    onSuccess: () => { invalidate(); setEditTarget(null); toast.success('Tenant mis à jour.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const suspendMutation = useMutation({
    mutationFn: (id: number) => suspendTenant(id),
    onSuccess: () => { invalidate(); toast.success('Tenant suspendu.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const activateMutation = useMutation({
    mutationFn: (id: number) => activateTenant(id),
    onSuccess: () => { invalidate(); toast.success('Tenant activé.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminTenant(id),
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['admin-stats'] }); setDeleteTarget(null); toast.success('Tenant supprimé.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return (
    <div className="p-6 space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold text-white">Tenants</h1>
          {data && (
            <span className="text-sm text-gray-500">{data.total} tenant{data.total > 1 ? 's' : ''}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition"
        >
          <PlusIcon className="h-4 w-4" />
          Nouveau tenant
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un tenant…"
          className="flex-1 min-w-48 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 transition"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as '' | 'true' | 'false'); setPage(1) }}
          aria-label="Filtrer par statut"
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition"
        >
          <option value="">Tous statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Suspendus</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value ? Number(e.target.value) : ''); setPage(1) }}
          aria-label="Filtrer par plan"
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition"
        >
          <option value="">Tous les plans</option>
          {plans.filter(p => p.is_active).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 overflow-x-auto">
        <table className="min-w-max w-full text-sm">
          <thead className="bg-gray-900 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Secteur</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Plan</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Utilisateurs</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Créé le</th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3 sr-only">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-950">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 rounded bg-gray-800 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : (data?.data ?? []).map((tenant) => (
                  <tr key={tenant.id}
                    className="hover:bg-gray-900/50 transition cursor-pointer"
                    onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {tenant.logo_url ? (
                          <img src={tenant.logo_url} alt="" className="h-7 w-7 rounded object-contain bg-gray-800 shrink-0" />
                        ) : (
                          <div className="h-7 w-7 rounded bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                            {tenant.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{tenant.name}</p>
                          <p className="text-xs text-gray-500">{tenant.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-400">
                      {SECTOR_LABELS[tenant.sector] ?? tenant.sector}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {tenant.subscription ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-200">
                            {tenant.subscription.plan_name ?? '—'}
                          </p>
                          <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            SUB_STATUS_COLOR[tenant.subscription.status] ?? 'bg-gray-800 text-gray-500'
                          }`}>
                            {SUB_STATUS_LABEL[tenant.subscription.status] ?? tenant.subscription.status}
                            {tenant.subscription.days_remaining !== null &&
                             tenant.subscription.days_remaining !== undefined &&
                             tenant.subscription.days_remaining <= 7 && (
                              <span className="ml-1 opacity-70">
                                · {tenant.subscription.days_remaining}j
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600 italic">Aucun</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-400">
                      {tenant.users_count}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                      {formatDate(tenant.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        tenant.is_active
                          ? 'bg-emerald-900/50 text-emerald-400'
                          : 'bg-red-900/50 text-red-400'
                      }`}>
                        {tenant.is_active ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* Boutique */}
                        <ActionButton
                          label="Boutique"
                          onClick={() => window.open(
                            tenant.custom_domain
                              ? `https://${tenant.custom_domain}`
                              : `${window.location.origin}/shop/${tenant.slug}`,
                            '_blank', 'noopener,noreferrer'
                          )}
                          className="hover:bg-indigo-900/30 hover:text-indigo-400"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </ActionButton>
                        {/* Modifier */}
                        <ActionButton label="Modifier" onClick={() => setEditTarget(tenant)} className="hover:bg-gray-800 hover:text-gray-200">
                          <PencilSquareIcon className="h-4 w-4" />
                        </ActionButton>
                        {/* Suspendre / Activer */}
                        {tenant.is_active ? (
                          <ActionButton label="Suspendre" onClick={() => setSuspendTarget(tenant)} className="hover:bg-orange-900/30 hover:text-orange-400">
                            <NoSymbolIcon className="h-4 w-4" />
                          </ActionButton>
                        ) : (
                          <ActionButton label="Activer" onClick={() => activateMutation.mutate(tenant.id)} className="hover:bg-emerald-900/30 hover:text-emerald-400">
                            <CheckCircleIcon className="h-4 w-4" />
                          </ActionButton>
                        )}
                        {/* Supprimer */}
                        <ActionButton label="Supprimer" onClick={() => setDeleteTarget(tenant)} className="hover:bg-red-900/30 hover:text-red-400">
                          <TrashIcon className="h-4 w-4" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {!isLoading && (data?.data ?? []).length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">Aucun tenant trouvé.</div>
        )}
      </div>

      {/* Pagination */}
      {data && data.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{data.total} tenant{data.total > 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-700 disabled:opacity-40 hover:border-gray-500 transition">
              Précédent
            </button>
            <button type="button" disabled={page === data.last_page} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-700 disabled:opacity-40 hover:border-gray-500 transition">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Modal création */}
      {createOpen && (
        <CreateTenantModal
          onClose={() => setCreateOpen(false)}
          onSubmit={(v) => createMutation.mutate(v)}
          isPending={createMutation.isPending}
        />
      )}

      {/* Modal édition */}
      {editTarget && (
        <EditTenantModal
          tenant={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={(v) => updateMutation.mutate({ id: editTarget.id, data: v })}
          isPending={updateMutation.isPending}
        />
      )}

      {/* Modal suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Supprimer le tenant</h2>
            <p className="text-sm text-gray-400">
              Supprimer <span className="font-semibold text-white">«{deleteTarget.name}»</span> ? Cette action est irréversible et supprimera toutes les données associées.
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500 transition">
                Annuler
              </button>
              <button type="button" onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60 transition">
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suspension */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Suspendre le tenant</h2>
            <p className="text-sm text-gray-400">
              Suspendre <span className="font-semibold text-white">«{suspendTarget.name}»</span> ?
              <span className="mt-2 block text-xs text-gray-500">
                Le tenant ne pourra plus se connecter. Vous pourrez le réactiver à tout moment.
              </span>
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setSuspendTarget(null)}
                className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500 transition">
                Annuler
              </button>
              <button type="button"
                onClick={() => { suspendMutation.mutate(suspendTarget.id); setSuspendTarget(null) }}
                disabled={suspendMutation.isPending}
                className="px-4 py-2 rounded-lg bg-orange-600 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-60 transition">
                {suspendMutation.isPending ? 'Suspension…' : 'Suspendre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal Création ─────────────────────────────────────────────────────────

function CreateTenantModal({ onClose, onSubmit, isPending }: {
  onClose: () => void
  onSubmit: (v: CreateValues) => void
  isPending: boolean
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { sector: 'general', currency: 'XOF', primary_color: '#2563eb', secondary_color: '#f59e0b' },
  })

  return (
    <AdminModal title="Nouveau tenant" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations boutique</legend>
          <AdminField label="Nom *" error={errors.name?.message}>
            <input {...register('name')} className={inputCls} placeholder="Ma boutique" />
          </AdminField>
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Secteur">
              <select {...register('sector')} className={inputCls}>
                <option value="general">Commerce général</option>
                <option value="food">Alimentation</option>
                <option value="fashion">Mode</option>
                <option value="cosmetic">Cosmétique</option>
              </select>
            </AdminField>
            <AdminField label="Devise">
              <select {...register('currency')} className={inputCls}>
                {['XOF','XAF','GNF','EUR','USD'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </AdminField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Téléphone"><input {...register('phone')} className={inputCls} /></AdminField>
            <AdminField label="Email" error={errors.email?.message}><input type="email" {...register('email')} className={inputCls} /></AdminField>
          </div>
          <AdminField label="Ville"><input {...register('city')} className={inputCls} /></AdminField>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Couleur primaire" value={watch('primary_color') ?? ''} onChange={(h) => setValue('primary_color', h)} error={errors.primary_color?.message} />
            <ColorField label="Couleur secondaire" value={watch('secondary_color') ?? ''} onChange={(h) => setValue('secondary_color', h)} error={errors.secondary_color?.message} />
          </div>
        </fieldset>

        <fieldset className="space-y-3 pt-2 border-t border-gray-800">
          <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Administrateur du tenant</legend>
          <AdminField label="Nom *" error={errors.admin_name?.message}>
            <input {...register('admin_name')} className={inputCls} />
          </AdminField>
          <AdminField label="Email *" error={errors.admin_email?.message}>
            <input type="email" {...register('admin_email')} className={inputCls} />
          </AdminField>
          <AdminField label="Mot de passe *" error={errors.admin_password?.message}>
            <input type="password" {...register('admin_password')} className={inputCls} />
          </AdminField>
        </fieldset>

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className={btnOutline}>Annuler</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? 'Création…' : 'Créer'}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}

// ── Modal Édition ──────────────────────────────────────────────────────────

function EditTenantModal({ tenant, onClose, onSubmit, isPending }: {
  tenant: AdminTenant
  onClose: () => void
  onSubmit: (v: EditValues) => void
  isPending: boolean
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name:            tenant.name,
      sector:          tenant.sector as EditValues['sector'],
      currency:        tenant.currency,
      phone:           tenant.phone ?? '',
      email:           tenant.email ?? '',
      address:         tenant.address ?? '',
      city:            tenant.city ?? '',
      primary_color:   tenant.primary_color ?? '#2563eb',
      secondary_color: tenant.secondary_color ?? '#f59e0b',
    },
  })

  return (
    <AdminModal title={`Modifier — ${tenant.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <AdminField label="Nom *" error={errors.name?.message}>
          <input {...register('name')} className={inputCls} />
        </AdminField>
        <div className="grid grid-cols-2 gap-3">
          <AdminField label="Secteur">
            <select {...register('sector')} className={inputCls}>
              <option value="general">Commerce général</option>
              <option value="food">Alimentation</option>
              <option value="fashion">Mode</option>
              <option value="cosmetic">Cosmétique</option>
            </select>
          </AdminField>
          <AdminField label="Devise">
            <select {...register('currency')} className={inputCls}>
              {['XOF','XAF','GNF','EUR','USD'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </AdminField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AdminField label="Téléphone"><input {...register('phone')} className={inputCls} /></AdminField>
          <AdminField label="Email"><input type="email" {...register('email')} className={inputCls} /></AdminField>
        </div>
        <AdminField label="Ville"><input {...register('city')} className={inputCls} /></AdminField>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Couleur primaire" value={watch('primary_color') ?? ''} onChange={(h) => setValue('primary_color', h)} error={errors.primary_color?.message} />
          <ColorField label="Couleur secondaire" value={watch('secondary_color') ?? ''} onChange={(h) => setValue('secondary_color', h)} error={errors.secondary_color?.message} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className={btnOutline}>Annuler</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}

// ── Composants partagés ────────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 transition'
const btnPrimary = 'px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 transition'
const btnOutline = 'px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500 transition'

function ColorField({ label, value, onChange, error }: {
  label: string
  value: string
  onChange: (hex: string) => void
  error?: string
}) {
  const safeHex = /^#[0-9A-Fa-f]{6}$/.test(value ?? '') ? value : '#374151'

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeHex}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-9 w-9 shrink-0 rounded-lg border border-gray-600 bg-transparent p-0.5 cursor-pointer"
        />
        <input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          placeholder="#2563eb"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

function AdminField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

function ActionButton({ label, onClick, className, children }: {
  label: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative group/tip">
      <button
        type="button"
        onClick={onClick}
        className={`rounded p-1.5 text-gray-500 transition ${className ?? ''}`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-gray-700 px-2 py-0.5 text-xs text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-10">
        {label}
      </span>
    </div>
  )
}

function AdminModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="w-full max-w-md rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4 my-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-300 transition text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}
