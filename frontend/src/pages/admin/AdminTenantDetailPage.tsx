import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import {
  ArrowLeftIcon, BuildingStorefrontIcon, UsersIcon,
  NoSymbolIcon, CheckCircleIcon, TrashIcon, LinkIcon, ClipboardDocumentIcon,
  CreditCardIcon, ClockIcon, ShoppingBagIcon, CurrencyDollarIcon,
  ChartBarSquareIcon,
} from '@heroicons/react/24/outline'
import {
  getAdminTenant, updateAdminTenant,
  suspendTenant, activateTenant, deleteAdminTenant,
  getAdminPlans, getTenantSubscription, assignSubscription, updateSubscription,
  getTenantSubscriptionHistory, getTenantStats,
} from '@/services/api/admin'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/utils'

// ── Schema ────────────────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide').or(z.literal('')).optional()

const schema = z.object({
  name:            z.string().min(2, 'Nom requis'),
  slug:            z.string()
    .min(2, 'Slug trop court')
    .max(80, 'Slug trop long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Minuscules, chiffres et tirets uniquement'),
  sector:          z.enum(['general', 'food', 'fashion', 'cosmetic']),
  currency:        z.string().min(3).max(3),
  custom_domain:   z.string().max(253).optional().or(z.literal('')),
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
  const [deleteOpen, setDeleteOpen] = useState(false)

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
        slug:            tenant.slug,
        sector:          tenant.sector as FormValues['sector'],
        currency:        tenant.currency,
        custom_domain:   tenant.custom_domain ?? '',
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
            title="Retour à la liste"
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
            onClick={() => setDeleteOpen(true)}
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

            <Field label="Slug (URL boutique)" error={errors.slug?.message}>
              <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus-within:border-indigo-500 transition">
                <span className="text-gray-500 shrink-0 select-none">/shop/</span>
                <input
                  {...register('slug')}
                  className="flex-1 bg-transparent text-white outline-none placeholder-gray-500 font-mono"
                  placeholder="mon-slug"
                />
              </div>
              <p className="mt-1 flex items-start gap-1 text-xs text-amber-400">
                <span>⚠</span>
                <span>Modifier le slug change l'URL publique de la boutique et casse les liens existants.</span>
              </p>
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

            <Field label="Domaine personnalisé" error={errors.custom_domain?.message}>
              <input
                {...register('custom_domain')}
                className={inputCls}
                placeholder="shop.client.sn"
              />
              <p className="mt-1 text-xs text-gray-500">
                Le client doit pointer son DNS vers votre VPS. Laisser vide pour l'option sous-domaine.
              </p>
            </Field>

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
              {/* Aperçu — input[type=color] affiche la couleur nativement sans inline style */}
              <div className="flex items-center gap-4 rounded-lg bg-gray-800 px-3 py-2">
                <span className="text-xs text-gray-400">Aperçu :</span>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5">
                    <input type="color" readOnly aria-label="Couleur primaire"
                      value={/^#[0-9A-Fa-f]{6}$/.test(watch('primary_color') ?? '') ? watch('primary_color')! : '#4F46E5'}
                      className="h-5 w-5 rounded border-0 p-0 cursor-default" />
                    <span className="text-xs text-gray-300">Primaire</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" readOnly aria-label="Couleur secondaire"
                      value={/^#[0-9A-Fa-f]{6}$/.test(watch('secondary_color') ?? '') ? watch('secondary_color')! : '#7C3AED'}
                      className="h-5 w-5 rounded border-0 p-0 cursor-default" />
                    <span className="text-xs text-gray-300">Secondaire</span>
                  </div>
                </div>
              </div>
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

      {/* Stats tenant */}
      <TenantStatsCard tenantId={tenant.id} />

      {/* Abonnement */}
      <SubscriptionCard tenantId={tenant.id} />

      {/* Historique abonnements */}
      <SubscriptionHistoryCard tenantId={tenant.id} />

      {/* Lien de connexion tenant */}
      <LoginLinkCard apiKey={tenant.api_key} slug={tenant.slug} customDomain={tenant.custom_domain} />

      {/* Modal confirmation suppression */}
      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer le tenant"
        confirmLabel="Supprimer définitivement"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      >
        <p className="text-sm text-gray-300">
          Voulez-vous supprimer définitivement{' '}
          <span className="font-semibold text-white">«{tenant.name}»</span> ?
          <span className="mt-2 block text-xs text-gray-400">
            Toutes les données de ce tenant (produits, ventes, clients…) seront supprimées de façon irréversible.
          </span>
        </p>
      </ConfirmModal>
    </div>
  )
}

// ── Carte Abonnement ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  trial:     'Essai',
  active:    'Actif',
  expired:   'Expiré',
  cancelled: 'Annulé',
}
const STATUS_COLOR: Record<string, string> = {
  trial:     'bg-blue-900/50 text-blue-300 border-blue-800',
  active:    'bg-emerald-900/50 text-emerald-400 border-emerald-800',
  expired:   'bg-red-900/50 text-red-400 border-red-800',
  cancelled: 'bg-gray-800 text-gray-500 border-gray-700',
}
const CYCLE_LABEL: Record<string, string> = {
  trial:    'Essai gratuit',
  monthly:  'Mensuel',
  yearly:   'Annuel',
  lifetime: 'À vie',
}

function SubscriptionCard({ tenantId }: { tenantId: number }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: plans = [] } = useQuery({
    queryKey: ['admin-plans'],
    queryFn:  getAdminPlans,
  })

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['admin-tenant-subscription', tenantId],
    queryFn:  () => getTenantSubscription(tenantId),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-tenant-subscription', tenantId] })

  // Formulaire d'assignation
  const [planId,   setPlanId]   = useState<number | ''>('')
  const [cycle,    setCycle]    = useState<string>('monthly')
  const [endsAt,   setEndsAt]   = useState('')
  const [notes,    setNotes]    = useState('')

  useEffect(() => {
    if (subscription) {
      setPlanId(subscription.plan?.id ?? '')
      setCycle(subscription.billing_cycle)
      setEndsAt(subscription.ends_at ? subscription.ends_at.slice(0, 10) : '')
      setNotes(subscription.notes ?? '')
    }
  }, [subscription])

  const assignMutation = useMutation({
    mutationFn: () => assignSubscription(tenantId, {
      plan_id:       planId as number,
      billing_cycle: cycle,
      ends_at:       endsAt || undefined,
      notes:         notes || undefined,
    }),
    onSuccess: () => { invalidate(); setShowForm(false); toast.success('Abonnement assigné.') },
    onError:   (err) => toast.error(getApiErrorMessage(err)),
  })

  const cancelMutation = useMutation({
    mutationFn: () => updateSubscription(tenantId, { status: 'cancelled' }),
    onSuccess: () => { invalidate(); toast.success('Abonnement annulé.') },
    onError:   (err) => toast.error(getApiErrorMessage(err)),
  })

  const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition'

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCardIcon className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-white">Abonnement</h2>
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition">
          {showForm ? 'Annuler' : subscription ? 'Modifier' : '+ Assigner'}
        </button>
      </div>

      {/* Abonnement courant */}
      {isLoading ? (
        <div className="h-8 rounded-lg bg-gray-800 animate-pulse" />
      ) : subscription ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-white">{subscription.plan?.name ?? '—'}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[subscription.status] ?? ''}`}>
              {STATUS_LABEL[subscription.status] ?? subscription.status}
            </span>
            <span className="text-xs text-gray-500">{CYCLE_LABEL[subscription.billing_cycle]}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div>Début : <span className="text-gray-200">{formatDate(subscription.starts_at)}</span></div>
            {subscription.ends_at && (
              <div>
                Fin : <span className={`font-medium ${(subscription.days_remaining ?? 99) <= 7 ? 'text-red-400' : 'text-gray-200'}`}>
                  {formatDate(subscription.ends_at)}
                  {subscription.days_remaining !== null && subscription.days_remaining >= 0 && (
                    <span className="ml-1 text-gray-500">({subscription.days_remaining}j restants)</span>
                  )}
                </span>
              </div>
            )}
          </div>
          {subscription.notes && (
            <p className="text-xs text-gray-500 italic">{subscription.notes}</p>
          )}
          {['trial', 'active'].includes(subscription.status) && (
            <button type="button" onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="text-xs text-red-500 hover:text-red-400 transition disabled:opacity-50">
              {cancelMutation.isPending ? 'Annulation…' : 'Résilier l\'abonnement'}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Aucun abonnement assigné à ce tenant.</p>
      )}

      {/* Formulaire d'assignation */}
      {showForm && (
        <div className="border-t border-gray-800 pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {subscription ? 'Nouvel abonnement (remplace l\'actuel)' : 'Assigner un abonnement'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Plan *</label>
              <select value={planId} onChange={(e) => setPlanId(Number(e.target.value))}
                aria-label="Sélectionner un plan"
                className={inputCls}>
                <option value="">— Choisir un plan —</option>
                {plans.filter((p) => p.is_active).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {Math.round(parseFloat(p.price_monthly)).toLocaleString('fr-FR')} XOF/mois
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Cycle</label>
              <select value={cycle} onChange={(e) => setCycle(e.target.value)}
                aria-label="Cycle de facturation"
                className={inputCls}>
                <option value="trial">Essai gratuit</option>
                <option value="monthly">Mensuel</option>
                <option value="yearly">Annuel</option>
                <option value="lifetime">À vie</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Date de fin <span className="font-normal text-gray-600">(vide = calculé auto)</span>
            </label>
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
              aria-label="Date de fin d'abonnement"
              className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Notes internes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Observations, accord commercial…"
              className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:border-gray-500 transition">
              Annuler
            </button>
            <button type="button"
              onClick={() => assignMutation.mutate()}
              disabled={!planId || assignMutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition">
              {assignMutation.isPending ? 'Enregistrement…' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LoginLinkCard({ apiKey, slug, customDomain }: { apiKey: string; slug: string; customDomain: string | null }) {
  const loginUrl = `${window.location.origin}/login?key=${apiKey}`
  const shopUrl  = customDomain
    ? `https://${customDomain}`
    : `${window.location.origin}/shop/${slug}`
  const [copied, setCopied] = useState(false)

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-white">Accès tenant</h2>
      </div>

      {/* Clé API */}
      <div>
        <p className="text-xs font-medium text-gray-400 mb-1.5">Clé d'accès (X-Tenant-ID)</p>
        <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2.5">
          <code className="flex-1 text-xs text-indigo-300 font-mono truncate">{apiKey}</code>
          <button type="button" onClick={() => copy(apiKey)} title="Copier la clé"
            className="shrink-0 text-gray-400 hover:text-white transition">
            <ClipboardDocumentIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Lien de connexion direct */}
      <div>
        <p className="text-xs font-medium text-gray-400 mb-1.5">Lien de connexion direct</p>
        <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2.5">
          <code className="flex-1 text-xs text-gray-300 font-mono truncate">{loginUrl}</code>
          <button type="button" onClick={() => copy(loginUrl)} title="Copier le lien"
            className="shrink-0 text-gray-400 hover:text-white transition">
            <ClipboardDocumentIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Partager ce lien au tenant admin — la boutique est pré-sélectionnée automatiquement.
        </p>
      </div>

      {/* URL boutique publique */}
      <div>
        <p className="text-xs font-medium text-gray-400 mb-1.5">
          URL boutique
          {customDomain && (
            <span className="ml-2 text-indigo-400 font-normal">· domaine personnalisé</span>
          )}
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2.5">
          <code className="flex-1 text-xs text-emerald-300 font-mono truncate">{shopUrl}</code>
          <button type="button" onClick={() => copy(shopUrl)} title="Copier l'URL"
            className="shrink-0 text-gray-400 hover:text-white transition">
            <ClipboardDocumentIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {copied && (
        <p className="text-xs text-emerald-400 font-medium">Copié dans le presse-papiers ✓</p>
      )}
    </div>
  )
}

// ── Carte Stats tenant ────────────────────────────────────────────────────

function TenantStatsCard({ tenantId }: { tenantId: number }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-tenant-stats', tenantId],
    queryFn:  () => getTenantStats(tenantId),
  })

  const items = [
    { label: 'Produits',   value: stats?.products_count,  icon: ShoppingBagIcon,    color: 'text-indigo-400' },
    { label: 'Ventes',     value: stats?.sales_count,     icon: CurrencyDollarIcon, color: 'text-emerald-400' },
    { label: 'Clients',    value: stats?.customers_count, icon: UsersIcon,          color: 'text-blue-400' },
    { label: 'Utilisateurs', value: stats?.users_count,   icon: UsersIcon,          color: 'text-violet-400' },
  ]

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ChartBarSquareIcon className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-white">Statistiques d'utilisation</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg bg-gray-800 px-4 py-3 flex items-center gap-3">
            <Icon className={`h-6 w-6 shrink-0 ${color}`} />
            <div>
              {isLoading ? (
                <div className="h-5 w-10 rounded bg-gray-700 animate-pulse mb-1" />
              ) : (
                <p className={`text-xl font-bold ${color}`}>{value ?? 0}</p>
              )}
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {stats?.last_sale_at && (
        <p className="text-xs text-gray-500">
          Dernière vente le{' '}
          <span className="text-gray-300">{formatDate(stats.last_sale_at)}</span>
          {stats.sales_revenue > 0 && (
            <> · Revenu total{' '}
              <span className="text-emerald-400 font-medium">
                {Math.round(stats.sales_revenue).toLocaleString('fr-FR')} XOF
              </span>
            </>
          )}
        </p>
      )}
    </div>
  )
}

// ── Carte Historique abonnements ──────────────────────────────────────────

function SubscriptionHistoryCard({ tenantId }: { tenantId: number }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['admin-tenant-subscriptions-history', tenantId],
    queryFn:  () => getTenantSubscriptionHistory(tenantId),
  })

  if (!isLoading && history.length === 0) return null

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
        <ClockIcon className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-white">Historique des abonnements</h2>
        {!isLoading && (
          <span className="ml-auto text-xs text-gray-500">{history.length} entrée{history.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="divide-y divide-gray-800">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="h-3 w-24 rounded bg-gray-800 animate-pulse" />
              <div className="h-3 w-16 rounded bg-gray-800 animate-pulse" />
              <div className="h-3 w-20 rounded bg-gray-800 animate-pulse ml-auto" />
            </div>
          ))
        ) : (
          history.map((sub) => (
            <div key={sub.id} className="px-5 py-3 flex items-center flex-wrap gap-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[sub.status] ?? ''}`}>
                {STATUS_LABEL[sub.status] ?? sub.status}
              </span>
              <span className="text-sm text-white font-medium">{sub.plan?.name ?? '—'}</span>
              <span className="text-xs text-gray-500">{CYCLE_LABEL[sub.billing_cycle]}</span>
              <div className="ml-auto text-xs text-gray-400 text-right">
                <span>{formatDate(sub.starts_at)}</span>
                {sub.ends_at && <span className="mx-1">→</span>}
                {sub.ends_at && <span>{formatDate(sub.ends_at)}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Modal de confirmation réutilisable ────────────────────────────────────

function ConfirmModal({ isOpen, onClose, title, confirmLabel, loading, onConfirm, children }: {
  isOpen: boolean
  onClose: () => void
  title: string
  confirmLabel: string
  loading?: boolean
  onConfirm: () => void
  children: React.ReactNode
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {children}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500 transition">
            Annuler
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60 transition">
            {loading ? 'Suppression…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
