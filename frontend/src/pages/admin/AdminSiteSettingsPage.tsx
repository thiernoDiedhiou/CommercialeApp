import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { getAdminSiteSettings, updateAdminSiteSettings, type SiteSettingsForm } from '@/services/api/admin'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import {
  EnvelopeIcon, ChatBubbleLeftRightIcon, MapPinIcon, ClockIcon,
  GlobeAltIcon, ShieldCheckIcon, CreditCardIcon,
} from '@heroicons/react/24/outline'

function Field({
  label, icon: Icon, hint, children,
}: {
  label: string
  icon: React.ElementType
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-200">
        <Icon className="h-4 w-4 text-gray-400" />
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{hint}</p>}
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-t border-gray-800 pt-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</h2>
      {description && <p className="mt-1 text-xs text-gray-500 leading-relaxed">{description}</p>}
    </div>
  )
}

export default function AdminSiteSettingsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-site-settings'],
    queryFn:  getAdminSiteSettings,
  })

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<SiteSettingsForm>()

  useEffect(() => {
    if (data) {
      reset({
        contact_email:               data.contact_email    ?? '',
        contact_whatsapp:            data.contact_whatsapp ?? '',
        contact_address:             data.contact_address  ?? '',
        contact_hours:               data.contact_hours    ?? '',
        facebook_url:                data.facebook_url     ?? '',
        twitter_url:                 data.twitter_url      ?? '',
        linkedin_url:                data.linkedin_url     ?? '',
        instagram_url:               data.instagram_url    ?? '',
        tenant_deletion_grace_days:  data.tenant_deletion_grace_days ?? 30,
        renewal_url:                 data.renewal_url      ?? '',
      })
    }
  }, [data, reset])

  const mutation = useMutation({
    mutationFn: (form: SiteSettingsForm) => {
      const cleaned = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
      ) as SiteSettingsForm
      return updateAdminSiteSettings(cleaned)
    },
    onSuccess: (updated) => {
      qc.setQueryData(['admin-site-settings'], updated)
      toast.success('Paramètres du site mis à jour')
      reset({ ...updated } as SiteSettingsForm)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  // Bordure plus visible sur fond sombre + focus ring indigo
  const inputClass = [
    'w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition',
    'border border-gray-600',
    'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25',
  ].join(' ')

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 p-6 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white">Paramètres du site</h1>
          <p className="mt-1 text-sm text-gray-400">
            Ces informations s'affichent sur la landing page publique (page Contact).
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <form id="site-settings-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">

            {/* ── Coordonnées ─────────────────────────────────────────────── */}
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                Coordonnées de contact
              </h2>
              <div className="space-y-4">
                <Field label="Email de contact" icon={EnvelopeIcon}>
                  <input
                    {...register('contact_email')}
                    type="email"
                    placeholder="contact@votreentreprise.sn"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Numéro WhatsApp"
                  icon={ChatBubbleLeftRightIcon}
                  hint="Format international recommandé : +221 00 000 00 00"
                >
                  <input
                    {...register('contact_whatsapp')}
                    type="text"
                    placeholder="+221 00 000 00 00"
                    className={inputClass}
                  />
                </Field>

                <Field label="Adresse / Localisation" icon={MapPinIcon}>
                  <input
                    {...register('contact_address')}
                    type="text"
                    placeholder="Dakar, Sénégal"
                    className={inputClass}
                  />
                </Field>

                <Field label="Horaires de réponse" icon={ClockIcon}>
                  <input
                    {...register('contact_hours')}
                    type="text"
                    placeholder="Lun–Ven 8h–18h"
                    className={inputClass}
                  />
                </Field>
              </div>
            </section>

            {/* ── Réseaux sociaux ──────────────────────────────────────────── */}
            <section>
              <SectionHeader title="Réseaux sociaux (optionnel)" />
              <div className="mt-4 space-y-4">
                {[
                  { name: 'facebook_url',  label: 'Facebook',    placeholder: 'https://facebook.com/didisphere' },
                  { name: 'twitter_url',   label: 'X / Twitter', placeholder: 'https://x.com/didisphere' },
                  { name: 'linkedin_url',  label: 'LinkedIn',    placeholder: 'https://linkedin.com/company/didisphere' },
                  { name: 'instagram_url', label: 'Instagram',   placeholder: 'https://instagram.com/didisphere' },
                ].map(({ name, label, placeholder }) => (
                  <Field key={name} label={label} icon={GlobeAltIcon}>
                    <input
                      {...register(name as keyof SiteSettingsForm)}
                      type="url"
                      placeholder={placeholder}
                      className={inputClass}
                    />
                  </Field>
                ))}
              </div>
            </section>

            {/* ── Renouvellement ───────────────────────────────────────────── */}
            <section>
              <SectionHeader
                title="Renouvellement d'abonnement"
                description="Lien affiché dans la bannière « abonnement expiré » du backoffice tenant. Laisser vide jusqu'à l'activation des moyens de paiement."
              />
              <div className="mt-4">
                <Field
                  label="Lien de paiement / renouvellement"
                  icon={CreditCardIcon}
                  hint="Interne : https://didisphere.shop/settings — Externe : lien Wave, Orange Money…"
                >
                  <input
                    {...register('renewal_url')}
                    type="url"
                    placeholder="https://didisphere.shop/settings"
                    className={inputClass}
                  />
                </Field>
              </div>
            </section>

            {/* ── RGPD ─────────────────────────────────────────────────────── */}
            <section>
              <SectionHeader
                title="Politique RGPD"
                description="Délai de grâce appliqué avant la suppression définitive des données d'un tenant (fenêtre de récupération)."
              />
              <div className="mt-4">
                <Field
                  label="Délai de grâce — suppression tenant"
                  icon={ShieldCheckIcon}
                  hint="Minimum 7 jours · Maximum 365 jours · Défaut recommandé : 30 jours"
                >
                  <div className="flex items-center gap-3">
                    <input
                      {...register('tenant_deletion_grace_days', { valueAsNumber: true })}
                      type="number"
                      min={7}
                      max={365}
                      className={`w-32 ${inputClass}`}
                    />
                    <span className="text-sm text-gray-400">jours</span>
                  </div>
                </Field>
              </div>
            </section>

            {/* Espace en bas pour que la barre sticky ne masque pas les derniers champs */}
            <div className="h-4" />
          </form>
        )}
      </div>

      {/* ── Barre sticky Enregistrer ────────────────────────────────────────── */}
      {!isLoading && (
        <div className="sticky bottom-0 z-10 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm px-6 py-4 lg:ml-0">
          <div className="flex max-w-2xl items-center gap-4">
            <button
              type="submit"
              form="site-settings-form"
              disabled={mutation.isPending || !isDirty}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>

            {isDirty && (
              <>
                <button
                  type="button"
                  onClick={() => data && reset({ ...data } as SiteSettingsForm)}
                  className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <span className="ml-auto text-xs text-amber-400 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Modifications non enregistrées
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
