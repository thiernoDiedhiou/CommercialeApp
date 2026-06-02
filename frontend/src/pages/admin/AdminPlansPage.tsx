import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusIcon, PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { getAdminPlans, createAdminPlan, updateAdminPlan, deleteAdminPlan } from '@/services/api/admin'
import type { Plan, PlanFormData } from '@/services/api/admin'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const schema = z.object({
  name:                  z.string().min(2, 'Nom requis'),
  slug:                  z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Minuscules, chiffres et tirets uniquement'),
  tagline:               z.string().max(255).optional().or(z.literal('')),
  badge:                 z.string().max(50).optional().or(z.literal('')),
  description:           z.string().optional().or(z.literal('')),
  features:              z.array(z.object({ value: z.string().max(255) })),
  sort_order:            z.number().int().min(0).default(0),
  is_active:             z.boolean().default(true),
  is_public:             z.boolean().default(true),
  price_monthly:         z.number().min(0),
  price_yearly:          z.number().min(0).nullable().optional(),
  yearly_discount_pct:   z.number().int().min(1).max(99).nullable().optional(),
  trial_days:            z.number().int().min(0).max(365).default(21),
  max_users:             z.number().int().min(0).default(0),
  max_products:          z.number().int().min(0).default(0),
  max_monthly_sales:     z.number().int().min(0).default(0),
  feature_pos:           z.boolean().default(true),
  feature_invoicing:     z.boolean().default(false),
  feature_purchases:     z.boolean().default(false),
  feature_reports:       z.boolean().default(false),
  feature_shop:          z.boolean().default(false),
  feature_import_csv:    z.boolean().default(false),
  feature_stock_alerts:  z.boolean().default(false),
  feature_multi_user:    z.boolean().default(false),
  feature_custom_domain: z.boolean().default(false),
})

type FormValues = z.infer<typeof schema>

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls  = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 transition'
const labelCls  = 'block text-xs font-medium text-gray-400 mb-1'

const FEATURES_META: { key: keyof FormValues; label: string }[] = [
  { key: 'feature_pos',           label: 'Caisse POS' },
  { key: 'feature_invoicing',     label: 'Facturation' },
  { key: 'feature_purchases',     label: 'Achats / Fournisseurs' },
  { key: 'feature_reports',       label: 'Rapports + Export CSV' },
  { key: 'feature_shop',          label: 'Boutique en ligne' },
  { key: 'feature_import_csv',    label: 'Import CSV produits' },
  { key: 'feature_stock_alerts',  label: 'Alertes email stock' },
  { key: 'feature_multi_user',    label: 'Multi-utilisateurs & groupes' },
  { key: 'feature_custom_domain', label: 'Domaine personnalisé' },
]

function planToForm(plan: Plan): FormValues {
  return {
    name:                  plan.name,
    slug:                  plan.slug,
    tagline:               plan.tagline ?? '',
    badge:                 plan.badge ?? '',
    description:           plan.description ?? '',
    features:              (plan.features ?? []).map((v) => ({ value: v })),
    sort_order:            plan.sort_order,
    is_active:             plan.is_active,
    is_public:             plan.is_public,
    price_monthly:         parseFloat(plan.price_monthly),
    price_yearly:          plan.price_yearly ? parseFloat(plan.price_yearly) : null,
    yearly_discount_pct:   plan.yearly_discount_pct ?? null,
    trial_days:            plan.trial_days,
    max_users:             plan.max_users,
    max_products:          plan.max_products,
    max_monthly_sales:     plan.max_monthly_sales,
    feature_pos:           plan.feature_pos,
    feature_invoicing:     plan.feature_invoicing,
    feature_purchases:     plan.feature_purchases,
    feature_reports:       plan.feature_reports,
    feature_shop:          plan.feature_shop,
    feature_import_csv:    plan.feature_import_csv,
    feature_stock_alerts:  plan.feature_stock_alerts,
    feature_multi_user:    plan.feature_multi_user,
    feature_custom_domain: plan.feature_custom_domain,
  }
}

function formToPayload(v: FormValues): PlanFormData {
  return {
    ...v,
    tagline:             v.tagline || undefined,
    badge:               v.badge   || undefined,
    description:         v.description || undefined,
    features:            v.features.map((f) => f.value).filter(Boolean),
    price_yearly:        v.price_yearly ?? null,
    yearly_discount_pct: v.yearly_discount_pct ?? null,
  }
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const qc = useQueryClient()
  const [modalPlan, setModalPlan] = useState<Plan | null | 'new'>(null)
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: getAdminPlans,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-plans'] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminPlan(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast.success('Plan supprimé.') },
    onError:   (err) => toast.error(getApiErrorMessage(err)),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold text-white">Plans</h1>
          <span className="text-sm text-gray-500">{plans.length} plan{plans.length > 1 ? 's' : ''}</span>
        </div>
        <button type="button" onClick={() => setModalPlan('new')}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition">
          <PlusIcon className="h-4 w-4" />
          Nouveau plan
        </button>
      </div>

      {/* Grille des plans */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => setModalPlan(plan)}
              onDelete={() => setDeleteTarget(plan)}
            />
          ))}
        </div>
      )}

      {/* Modal création / édition */}
      {modalPlan !== null && (
        <PlanModal
          plan={modalPlan === 'new' ? null : modalPlan}
          onClose={() => setModalPlan(null)}
          onSaved={() => { invalidate(); setModalPlan(null) }}
        />
      )}

      {/* Modal suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Supprimer le plan</h2>
            <p className="text-sm text-gray-400">
              Supprimer <span className="font-semibold text-white">«{deleteTarget.name}»</span> ?
              <span className="mt-1 block text-xs text-gray-500">
                Impossible si des abonnements actifs y sont rattachés.
              </span>
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
    </div>
  )
}

// ── Carte plan ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit, onDelete }: { plan: Plan; onEdit: () => void; onDelete: () => void }) {
  const monthly = Math.round(parseFloat(plan.price_monthly)).toLocaleString('fr-FR')
  const yearly  = plan.price_yearly ? Math.round(parseFloat(plan.price_yearly)).toLocaleString('fr-FR') : null

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{plan.name}</h2>
            {plan.badge && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-800">
                {plan.badge}
              </span>
            )}
            {!plan.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">Inactif</span>
            )}
          </div>
          {plan.tagline && <p className="text-xs text-gray-400 mt-0.5">{plan.tagline}</p>}
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onEdit} title="Modifier"
            className="rounded p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-200 transition">
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} title="Supprimer"
            className="rounded p-1.5 text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Prix */}
      <div className="space-y-1">
        <p className="text-white font-semibold">
          {monthly} <span className="text-xs font-normal text-gray-400">XOF / mois</span>
        </p>
        {yearly && (
          <p className="text-sm text-gray-400">
            {yearly} XOF / an
            {plan.yearly_discount_pct && (
              <span className="ml-2 text-xs text-emerald-400">−{plan.yearly_discount_pct}%</span>
            )}
          </p>
        )}
        <p className="text-xs text-gray-500">{plan.trial_days} jours d'essai gratuit</p>
      </div>

      {/* Abonnés */}
      <div className="flex items-center gap-3 text-xs">
        {(plan.active_subscribers_count ?? 0) > 0 ? (
          <span className="text-emerald-400 font-medium">
            {plan.active_subscribers_count} actif{(plan.active_subscribers_count ?? 0) > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-gray-600">0 actif</span>
        )}
        {(plan.trial_subscribers_count ?? 0) > 0 && (
          <span className="text-blue-400">· {plan.trial_subscribers_count} en essai</span>
        )}
      </div>

      {/* Limites */}
      <div className="flex gap-3 text-xs text-gray-400">
        <span>{plan.max_users === 0 ? '∞' : plan.max_users} utilisateurs</span>
        <span>·</span>
        <span>{plan.max_products === 0 ? '∞' : plan.max_products} produits</span>
      </div>

      {/* Features */}
      <ul className="space-y-1.5 flex-1">
        {FEATURES_META.map(({ key, label }) => {
          const active = plan[key as keyof Plan] as boolean
          return (
            <li key={key} className={`flex items-center gap-2 text-xs ${active ? 'text-gray-300' : 'text-gray-600'}`}>
              {active
                ? <CheckIcon className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                : <XMarkIcon className="h-3.5 w-3.5 shrink-0" />
              }
              {label}
            </li>
          )
        })}
      </ul>

      {/* Bullet points configurés */}
      {plan.features && plan.features.length > 0 && (
        <div className="border-t border-gray-800 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Description marketing</p>
          <ul className="space-y-1">
            {plan.features.slice(0, 3).map((f, i) => (
              <li key={i} className="text-xs text-gray-400 truncate">• {f}</li>
            ))}
            {plan.features.length > 3 && (
              <li className="text-xs text-gray-600">+{plan.features.length - 3} autres…</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Modal création / édition ──────────────────────────────────────────────────

function PlanModal({ plan, onClose, onSaved }: { plan: Plan | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = plan !== null

  const defaultValues: FormValues = plan ? planToForm(plan) : {
    name: '', slug: '', tagline: '', badge: '', description: '',
    features: [], sort_order: 0, is_active: true, is_public: true,
    price_monthly: 0, price_yearly: null, yearly_discount_pct: null, trial_days: 21,
    max_users: 0, max_products: 0, max_monthly_sales: 0,
    feature_pos: true, feature_invoicing: false, feature_purchases: false,
    feature_reports: false, feature_shop: false, feature_import_csv: false,
    feature_stock_alerts: false, feature_multi_user: false, feature_custom_domain: false,
  }

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'features' })

  const mutation = useMutation({
    mutationFn: (v: FormValues) => isEdit
      ? updateAdminPlan(plan.id, formToPayload(v))
      : createAdminPlan(formToPayload(v)),
    onSuccess: () => { toast.success(isEdit ? 'Plan mis à jour.' : 'Plan créé.'); onSaved() },
    onError:   (err) => toast.error(getApiErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-5 my-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? `Modifier — ${plan.name}` : 'Nouveau plan'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5">

          {/* ── Identité ── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Identité</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nom *</label>
                <input {...register('name')} className={inputCls} placeholder="Starter" />
                {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Slug *</label>
                <input {...register('slug')} className={`${inputCls} font-mono`} placeholder="starter" />
                {errors.slug && <p className="mt-1 text-xs text-red-400">{errors.slug.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tagline</label>
                <input {...register('tagline')} className={inputCls} placeholder="Parfait pour démarrer" />
              </div>
              <div>
                <label className={labelCls}>Badge</label>
                <input {...register('badge')} className={inputCls} placeholder="Populaire" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Ordre affichage</label>
                <input type="number" {...register('sort_order', { valueAsNumber: true })} className={inputCls} min={0} />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Controller name="is_active" control={control} render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={field.value} onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-indigo-600" />
                    <span className="text-xs text-gray-300">Actif</span>
                  </label>
                )} />
                <Controller name="is_public" control={control} render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={field.value} onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-indigo-600" />
                    <span className="text-xs text-gray-300">Public</span>
                  </label>
                )} />
              </div>
            </div>
          </section>

          {/* ── Tarification ── */}
          <section className="space-y-3 pt-2 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tarification</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Prix mensuel (XOF) *</label>
                <input type="number" {...register('price_monthly', { valueAsNumber: true })} className={inputCls} min={0} />
                {errors.price_monthly && <p className="mt-1 text-xs text-red-400">{errors.price_monthly.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Prix annuel (XOF)</label>
                <input type="number" {...register('price_yearly', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })} className={inputCls} min={0} placeholder="Optionnel" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Remise annuelle (%)</label>
                <input type="number" {...register('yearly_discount_pct', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })} className={inputCls} min={1} max={99} placeholder="Ex: 16" />
              </div>
              <div>
                <label className={labelCls}>Jours d'essai</label>
                <input type="number" {...register('trial_days', { valueAsNumber: true })} className={inputCls} min={0} max={365} />
              </div>
            </div>
          </section>

          {/* ── Limites ── */}
          <section className="space-y-3 pt-2 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Limites <span className="normal-case font-normal">(0 = illimité)</span></p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Utilisateurs</label>
                <input type="number" {...register('max_users', { valueAsNumber: true })} className={inputCls} min={0} />
              </div>
              <div>
                <label className={labelCls}>Produits</label>
                <input type="number" {...register('max_products', { valueAsNumber: true })} className={inputCls} min={0} />
              </div>
              <div>
                <label className={labelCls}>Ventes / mois</label>
                <input type="number" {...register('max_monthly_sales', { valueAsNumber: true })} className={inputCls} min={0} />
              </div>
            </div>
          </section>

          {/* ── Modules ── */}
          <section className="space-y-3 pt-2 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Modules</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {FEATURES_META.map(({ key, label }) => (
                <Controller key={key} name={key as keyof FormValues} control={control} render={({ field }) => (
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={field.value as boolean} onChange={field.onChange}
                      className="h-4 w-4 shrink-0 rounded border-gray-600 bg-gray-800 accent-indigo-600" />
                    <span className="text-sm text-gray-300 group-hover:text-white transition">{label}</span>
                  </label>
                )} />
              ))}
            </div>
          </section>

          {/* ── Description marketing (bullet points) ── */}
          <section className="space-y-3 pt-2 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Description marketing</p>
            <p className="text-xs text-gray-500">Ces points apparaissent sur la page de tarification et dans l'interface admin.</p>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <span className="text-gray-600 text-xs w-4 shrink-0">{index + 1}.</span>
                  <input
                    {...register(`features.${index}.value`)}
                    className={`${inputCls} flex-1`}
                    placeholder="Ex: Caisse POS complète"
                  />
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => index > 0 && move(index, index - 1)}
                      disabled={index === 0}
                      aria-label="Déplacer vers le haut"
                      className="rounded p-1 text-gray-600 hover:text-gray-300 disabled:opacity-20 transition text-xs">↑</button>
                    <button type="button" onClick={() => index < fields.length - 1 && move(index, index + 1)}
                      disabled={index === fields.length - 1}
                      aria-label="Déplacer vers le bas"
                      className="rounded p-1 text-gray-600 hover:text-gray-300 disabled:opacity-20 transition text-xs">↓</button>
                    <button type="button" onClick={() => remove(index)}
                      aria-label="Supprimer cette ligne"
                      className="rounded p-1 text-gray-600 hover:text-red-400 transition">
                      <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => append({ value: '' })}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition mt-1">
                <PlusIcon className="h-3.5 w-3.5" />
                Ajouter une ligne
              </button>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-800">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500 transition">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting || mutation.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 transition">
              {mutation.isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
