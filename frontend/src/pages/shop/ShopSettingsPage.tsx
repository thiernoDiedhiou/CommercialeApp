import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getShopSettings,
  toggleShopActive,
  updateShopSettings,
} from '@/shop/services/shop'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShopSettingsData {
  is_active               : boolean
  shop_name               : string | null
  shop_description        : string | null
  logo_url                : string | null
  favicon_url             : string | null
  hero_banner_url         : string | null
  hero_title              : string | null
  hero_subtitle           : string | null
  primary_color           : string | null
  secondary_color         : string | null
  accent_color            : string | null
  whatsapp_number         : string | null
  facebook_url            : string | null
  instagram_url           : string | null
  twitter_url             : string | null
  address                 : string | null
  opening_hours           : string | null
  announcement_bar        : string | null
  announcement_bar_active : boolean
  meta_title              : string | null
  meta_description        : string | null
  google_analytics_id     : string | null
  footer_text             : string | null
  minimum_order           : number | null
}

type Tab = 'general' | 'appearance' | 'contact' | 'seo'

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ShopSettingsPage() {
  const qc     = useQueryClient()
  const tenant = useAuthStore((s) => s.tenant)
  const slug   = tenant?.slug ?? ''

  const [tab, setTab] = useState<Tab>('general')

  // Fichiers sélectionnés localement
  const [logoFile,    setLogoFile]    = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [bannerFile,  setBannerFile]  = useState<File | null>(null)
  const logoInputRef    = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef  = useRef<HTMLInputElement>(null)

  // Champs formulaire locaux (contrôlés)
  const [fields, setFields] = useState<Partial<ShopSettingsData>>({})

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: settingsResp, isLoading } = useQuery({
    queryKey: ['shop-settings'],
    queryFn : getShopSettings,
  })

  const settings = settingsResp?.data as ShopSettingsData | undefined

  // Initialise les champs locaux quand la query revient
  useEffect(() => {
    if (!settings) return
    setFields({
      shop_name              : settings.shop_name ?? '',
      shop_description       : settings.shop_description ?? '',
      hero_title             : settings.hero_title ?? '',
      hero_subtitle          : settings.hero_subtitle ?? '',
      primary_color          : settings.primary_color ?? '#111827',
      secondary_color        : settings.secondary_color ?? '#374151',
      accent_color           : settings.accent_color ?? '#2563EB',
      whatsapp_number        : settings.whatsapp_number ?? '',
      facebook_url           : settings.facebook_url ?? '',
      instagram_url          : settings.instagram_url ?? '',
      twitter_url            : settings.twitter_url ?? '',
      address                : settings.address ?? '',
      opening_hours          : settings.opening_hours ?? '',
      announcement_bar       : settings.announcement_bar ?? '',
      announcement_bar_active: settings.announcement_bar_active ?? false,
      minimum_order          : settings.minimum_order ?? 0,
      meta_title             : settings.meta_title ?? '',
      meta_description       : settings.meta_description ?? '',
      google_analytics_id    : settings.google_analytics_id ?? '',
      footer_text            : settings.footer_text ?? '',
    })
  }, [settings])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: toggleShopActive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop-settings'] })
      toast.success('Statut de la boutique mis à jour')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const saveMutation = useMutation({
    mutationFn: (fd: FormData) => updateShopSettings(fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop-settings'] })
      toast.success('Paramètres enregistrés')
      setLogoFile(null)
      setFaviconFile(null)
      setBannerFile(null)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  // ── Helpers ────────────────────────────────────────────────────────────────

  const set = (key: keyof ShopSettingsData, value: unknown) =>
    setFields((prev) => ({ ...prev, [key]: value }))

  const handleSave = () => {
    const fd = new FormData()
    Object.entries(fields).forEach(([k, v]) => {
      if (v === null || v === undefined) return
      if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
      else fd.append(k, String(v))
    })
    if (logoFile)    fd.append('logo',        logoFile)
    if (faviconFile) fd.append('favicon',     faviconFile)
    if (bannerFile)  fd.append('hero_banner', bannerFile)
    saveMutation.mutate(fd)
  }

  const logoPreview    = logoFile    ? URL.createObjectURL(logoFile)    : (settings?.logo_url ?? null)
  const faviconPreview = faviconFile ? URL.createObjectURL(faviconFile) : (settings?.favicon_url ?? null)
  const bannerPreview  = bannerFile  ? URL.createObjectURL(bannerFile)  : (settings?.hero_banner_url ?? null)

  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-gray-500 animate-spin" />
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general',    label: 'Général' },
    { key: 'appearance', label: 'Apparence' },
    { key: 'contact',    label: 'Contact' },
    { key: 'seo',        label: 'SEO' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ma boutique en ligne</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez l'apparence et les paramètres de votre boutique</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge statut */}
          {settings?.is_active ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              En ligne
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Hors ligne
            </span>
          )}

          {/* Toggle activé */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-700 font-medium">
              {settings?.is_active ? 'Désactiver' : 'Activer'}
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={settings?.is_active ?? false}
              onChange={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              className="sr-only"
            />
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                settings?.is_active ? 'bg-green-500' : 'bg-gray-300'
              } ${toggleMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings?.is_active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </label>

          {/* Lien boutique */}
          {settings?.is_active && slug && (
            <button
              type="button"
              onClick={() => window.open(`/shop/${slug}`, '_blank')}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Voir ma boutique →
            </button>
          )}
        </div>
      </div>

      {/* ── Onglets ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-5">

          {/* ── GÉNÉRAL ─────────────────────────────────────────────────── */}
          {tab === 'general' && (
            <>
              <Field label="Nom de la boutique *">
                <input
                  type="text"
                  value={fields.shop_name ?? ''}
                  onChange={(e) => set('shop_name', e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Ma boutique"
                />
              </Field>

              <Field label="Description">
                <textarea
                  rows={3}
                  value={fields.shop_description ?? ''}
                  onChange={(e) => set('shop_description', e.target.value)}
                  className={`${INPUT_CLS} resize-none`}
                  placeholder="Quelques mots sur votre boutique…"
                />
              </Field>

              <Field label="Logo">
                {logoPreview && (
                  <img src={logoPreview} alt="Logo" className="h-16 w-auto mb-2 rounded-lg object-contain border border-gray-100 p-1" />
                )}
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                  aria-label="Logo de la boutique"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => logoInputRef.current?.click()}
                  className="text-sm text-blue-600 hover:underline">
                  {logoPreview ? 'Changer le logo' : 'Choisir un fichier'}
                </button>
              </Field>

              <Field label="Favicon">
                <p className="text-xs text-gray-400">Icône affichée dans l'onglet du navigateur (32×32px recommandé)</p>
                {faviconPreview && (
                  <img src={faviconPreview} alt="Favicon" className="h-10 w-10 mb-2 rounded-lg object-contain border border-gray-100 p-1" />
                )}
                <input ref={faviconInputRef} type="file" accept="image/*" className="hidden"
                  aria-label="Favicon de la boutique"
                  onChange={(e) => setFaviconFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => faviconInputRef.current?.click()}
                  className="text-sm text-blue-600 hover:underline">
                  {faviconPreview ? 'Changer le favicon' : 'Choisir un fichier'}
                </button>
              </Field>

              <Field label="Bannière hero">
                {bannerPreview && (
                  <img src={bannerPreview} alt="Bannière" className="h-24 w-full object-cover rounded-xl mb-2" />
                )}
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden"
                  aria-label="Bannière hero de la boutique"
                  onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => bannerInputRef.current?.click()}
                  className="text-sm text-blue-600 hover:underline">
                  {bannerPreview ? 'Changer la bannière' : 'Choisir un fichier'}
                </button>
              </Field>

              <Field label="Titre hero">
                <input type="text" value={fields.hero_title ?? ''} onChange={(e) => set('hero_title', e.target.value)}
                  className={INPUT_CLS} placeholder="Bienvenue dans notre boutique" />
              </Field>

              <Field label="Sous-titre hero">
                <input type="text" value={fields.hero_subtitle ?? ''} onChange={(e) => set('hero_subtitle', e.target.value)}
                  className={INPUT_CLS} placeholder="Découvrez nos meilleurs produits" />
              </Field>

              <Field label="Montant minimum de commande (FCFA)">
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={fields.minimum_order ?? 0}
                  onChange={(e) => set('minimum_order', parseFloat(e.target.value) || 0)}
                  className={INPUT_CLS}
                  placeholder="0"
                />
                <p className="text-xs text-gray-400">Laisser à 0 pour aucun minimum</p>
              </Field>
            </>
          )}

          {/* ── APPARENCE ───────────────────────────────────────────────── */}
          {tab === 'appearance' && (
            <>
              <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                Ces couleurs s'appliquent à votre boutique en ligne et surpassent les couleurs de base de votre espace.
              </p>

              {(['primary_color', 'secondary_color', 'accent_color'] as const).map((key) => {
                const labels: Record<string, string> = {
                  primary_color  : 'Couleur principale',
                  secondary_color: 'Couleur secondaire',
                  accent_color   : 'Couleur accent / CTA',
                }
                return (
                  <Field key={key} label={labels[key]}>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={fields[key] ?? '#111827'}
                        onChange={(e) => set(key, e.target.value)}
                        aria-label={labels[key]}
                        className="h-10 w-16 rounded-lg border border-gray-200 p-1 cursor-pointer"
                      />
                      <span className="text-sm font-mono text-gray-700">{fields[key] ?? ''}</span>
                    </div>
                  </Field>
                )
              })}
            </>
          )}

          {/* ── CONTACT ─────────────────────────────────────────────────── */}
          {tab === 'contact' && (
            <>
              <Field label="WhatsApp">
                <input type="tel" value={fields.whatsapp_number ?? ''} onChange={(e) => set('whatsapp_number', e.target.value)}
                  className={INPUT_CLS} placeholder="+221 77 000 00 00" />
              </Field>
              <Field label="Facebook">
                <input type="url" value={fields.facebook_url ?? ''} onChange={(e) => set('facebook_url', e.target.value)}
                  className={INPUT_CLS} placeholder="https://facebook.com/votre-page" />
              </Field>
              <Field label="Instagram">
                <input type="url" value={fields.instagram_url ?? ''} onChange={(e) => set('instagram_url', e.target.value)}
                  className={INPUT_CLS} placeholder="https://instagram.com/votre-compte" />
              </Field>
              <Field label="Twitter / X">
                <input type="url" value={fields.twitter_url ?? ''} onChange={(e) => set('twitter_url', e.target.value)}
                  className={INPUT_CLS} placeholder="https://x.com/votre-compte" />
              </Field>
              <Field label="Adresse physique">
                <input type="text" value={fields.address ?? ''} onChange={(e) => set('address', e.target.value)}
                  className={INPUT_CLS} placeholder="Dakar, Plateau, Rue 10" />
              </Field>
              <Field label="Horaires d'ouverture">
                <textarea rows={3} value={fields.opening_hours ?? ''} onChange={(e) => set('opening_hours', e.target.value)}
                  className={`${INPUT_CLS} resize-none`} placeholder="Lun–Ven 8h–18h&#10;Sam 9h–13h" />
              </Field>
              <Field label="Barre d'annonce">
                <input type="text" value={fields.announcement_bar ?? ''} onChange={(e) => set('announcement_bar', e.target.value)}
                  className={INPUT_CLS} placeholder="Livraison gratuite dès 10 000 FCFA !" />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fields.announcement_bar_active ?? false}
                    onChange={(e) => set('announcement_bar_active', e.target.checked)}
                    className="w-4 h-4 rounded accent-gray-900"
                  />
                  <span className="text-sm text-gray-700">Afficher la barre d'annonce</span>
                </label>
              </Field>
            </>
          )}

          {/* ── SEO ─────────────────────────────────────────────────────── */}
          {tab === 'seo' && (
            <>
              <Field label={`Meta title (${(fields.meta_title ?? '').length}/60)`}>
                <input type="text" value={fields.meta_title ?? ''} maxLength={60}
                  onChange={(e) => set('meta_title', e.target.value)}
                  className={INPUT_CLS} placeholder="Ma boutique — Sénégal" />
              </Field>
              <Field label={`Meta description (${(fields.meta_description ?? '').length}/160)`}>
                <textarea rows={3} value={fields.meta_description ?? ''} maxLength={160}
                  onChange={(e) => set('meta_description', e.target.value)}
                  className={`${INPUT_CLS} resize-none`} placeholder="Découvrez nos produits de qualité…" />
              </Field>
              <Field label="Google Analytics ID">
                <input type="text" value={fields.google_analytics_id ?? ''}
                  onChange={(e) => set('google_analytics_id', e.target.value)}
                  className={INPUT_CLS} placeholder="G-XXXXXXXXXX" />
              </Field>
              <Field label="Texte de pied de page">
                <input type="text" value={fields.footer_text ?? ''}
                  onChange={(e) => set('footer_text', e.target.value)}
                  className={INPUT_CLS} placeholder="© 2026 Ma boutique. Tous droits réservés." />
              </Field>
            </>
          )}

          {/* ── Bouton enregistrer ────────────────────────────────────── */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-6 h-10 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

const INPUT_CLS = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}
