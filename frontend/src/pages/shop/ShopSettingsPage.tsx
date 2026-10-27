import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getShopSettings,
  toggleShopActive,
  updateShopSettings,
} from '@/shop/services/shop'
import type { TrustBadge, PromoBlock } from '@/shop/store/shopStore'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'

// ── Types ─────────────────────────────────────────────────────────────────────

const BADGE_ICONS: Record<TrustBadge['icon'], string> = {
  delivery: '🚚',
  payment : '💳',
  quality : '✅',
  support : '💬',
}

const DEFAULT_TRUST_BADGES: TrustBadge[] = [
  { icon: 'delivery', title: 'Livraison rapide',  subtitle: 'À votre porte',     active: true },
  { icon: 'payment',  title: 'Paiement sécurisé', subtitle: 'Plusieurs options', active: true },
  { icon: 'quality',  title: 'Qualité garantie',  subtitle: 'Produits vérifiés', active: true },
  { icon: 'support',  title: 'Support client',    subtitle: 'Réponse rapide',    active: true },
]

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
  tiktok_url              : string | null
  youtube_url             : string | null
  address                 : string | null
  opening_hours           : string | null
  announcement_bar        : string | null
  announcement_bar_active : boolean
  meta_title              : string | null
  meta_description        : string | null
  google_analytics_id     : string | null
  footer_text             : string | null
  minimum_order           : number | null
  trust_badges            : TrustBadge[] | null
  promo_blocks            : PromoBlock[] | null
}

type Tab = 'general' | 'appearance' | 'contact' | 'seo' | 'trust' | 'promo'

const DEFAULT_PROMO_BLOCK: PromoBlock = {
  title    : '',
  subtitle : '',
  color    : '#e11d48',
  image_url: null,
  link     : '?on_sale=1',
  emoji    : '🔥',
}

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
  const [badges, setBadges]           = useState<TrustBadge[]>(DEFAULT_TRUST_BADGES)
  const [promoBlocks, setPromoBlocks] = useState<PromoBlock[]>([])
  const [promoImages, setPromoImages] = useState<(File | null)[]>([null, null, null, null])
  const logoInputRef    = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef  = useRef<HTMLInputElement>(null)
  const promoImageRefs  = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

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
      tiktok_url             : settings.tiktok_url ?? '',
      youtube_url            : settings.youtube_url ?? '',
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
    setBadges(
      (settings.trust_badges ?? DEFAULT_TRUST_BADGES).map((b) => ({
        ...b,
        subtitle: b.subtitle ?? '',
      }))
    )
    setPromoBlocks(
      (settings.promo_blocks ?? []).map((b) => ({
        ...b,
        subtitle : b.subtitle ?? '',
        image_url: b.image_url ?? null,
      }))
    )
    setPromoImages([null, null, null, null])
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
      setPromoImages([null, null, null, null])
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  // ── Helpers ────────────────────────────────────────────────────────────────

  const set = (key: keyof ShopSettingsData, value: unknown) =>
    setFields((prev) => ({ ...prev, [key]: value }))

  // Auto-sauvegarde immédiate des promo_blocks (utilisé sur suppression d'un bloc)
  const savePromoBlocksNow = (blocks: PromoBlock[]) => {
    const fd = new FormData()
    fd.append('promo_blocks', JSON.stringify(blocks))
    saveMutation.mutate(fd)
  }

  const handleDeletePromoBlock = (i: number) => {
    const newBlocks = promoBlocks.filter((_, idx) => idx !== i)
    setPromoBlocks(newBlocks)
    setPromoImages((prev) => {
      const next = [...prev]
      next.splice(i, 1)
      next.push(null)
      return next
    })
    savePromoBlocksNow(newBlocks)
  }

  const handleSave = () => {
    const fd = new FormData()
    Object.entries(fields).forEach(([k, v]) => {
      if (v === null || v === undefined) return
      if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
      else fd.append(k, String(v))
    })
    fd.append('trust_badges', JSON.stringify(badges))
    fd.append('promo_blocks', JSON.stringify(promoBlocks))
    if (logoFile)    fd.append('logo',        logoFile)
    if (faviconFile) fd.append('favicon',     faviconFile)
    if (bannerFile)  fd.append('hero_banner', bannerFile)
    promoImages.forEach((file, i) => {
      if (file) fd.append(`promo_block_image_${i}`, file)
    })
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
    { key: 'trust',      label: 'Confiance' },
    { key: 'promo',      label: 'Promos' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ma boutique en ligne</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gérez l'apparence et les paramètres de votre boutique</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge statut */}
          {settings?.is_active ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              En ligne
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Hors ligne
            </span>
          )}

          {/* Toggle activé */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
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
                settings?.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                <p className="text-xs text-gray-400 dark:text-gray-500">Icône affichée dans l'onglet du navigateur (32×32px recommandé)</p>
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
                <p className="text-xs text-gray-400 dark:text-gray-500">Laisser à 0 pour aucun minimum</p>
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
                      <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{fields[key] ?? ''}</span>
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
              <Field label="TikTok">
                <input type="url" value={fields.tiktok_url ?? ''} onChange={(e) => set('tiktok_url', e.target.value)}
                  className={INPUT_CLS} placeholder="https://tiktok.com/@votre-compte" />
              </Field>
              <Field label="YouTube">
                <input type="url" value={fields.youtube_url ?? ''} onChange={(e) => set('youtube_url', e.target.value)}
                  className={INPUT_CLS} placeholder="https://youtube.com/@votre-chaine" />
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
                  <span className="text-sm text-gray-700 dark:text-gray-300">Afficher la barre d'annonce</span>
                </label>
              </Field>
            </>
          )}

          {/* ── SEO ─────────────────────────────────────────────────────── */}
          {tab === 'seo' && (() => {
            const titleLen = (fields.meta_title ?? '').length
            const descLen  = (fields.meta_description ?? '').length
            const gaId     = (fields.google_analytics_id ?? '').trim()
            const gaValid  = gaId === '' || /^G-[A-Z0-9]{4,12}$/i.test(gaId)

            const titleColor = titleLen === 0 ? 'text-gray-400'
              : titleLen < 30  ? 'text-orange-500'
              : titleLen <= 60 ? 'text-green-600'
              : 'text-red-500'

            const descColor = descLen === 0 ? 'text-gray-400'
              : descLen < 80   ? 'text-orange-500'
              : descLen <= 160 ? 'text-green-600'
              : 'text-red-500'

            const previewTitle = fields.meta_title?.trim() || fields.shop_name || 'Ma boutique'
            const previewDesc  = fields.meta_description?.trim() || 'Découvrez nos produits en ligne. Commandez facilement.'
            const previewUrl   = `didisphere.shop/shop/${slug}`

            return (
              <>
                {/* ── Aperçu Google ──────────────────────────────────────── */}
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Aperçu dans Google</p>
                  <p className="text-[#1a0dab] text-lg font-medium leading-snug truncate">
                    {previewTitle.length > 60 ? previewTitle.slice(0, 57) + '…' : previewTitle}
                  </p>
                  <p className="text-[#006621] text-sm">{previewUrl}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                    {previewDesc.length > 160 ? previewDesc.slice(0, 157) + '…' : previewDesc}
                  </p>
                </div>

                {/* ── Meta title ─────────────────────────────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meta title</label>
                    <span className={`text-xs font-medium ${titleColor}`}>{titleLen}/60</span>
                  </div>
                  <input type="text" value={fields.meta_title ?? ''} maxLength={60}
                    onChange={(e) => set('meta_title', e.target.value)}
                    className={INPUT_CLS} placeholder="Ma boutique — Dakar, Sénégal" />
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Le titre affiché dans les résultats Google et les onglets de navigateur.
                    Idéal entre <strong>40 et 60 caractères</strong>. Incluez le nom de votre boutique et votre ville.
                  </p>
                </div>

                {/* ── Meta description ───────────────────────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meta description</label>
                    <span className={`text-xs font-medium ${descColor}`}>{descLen}/160</span>
                  </div>
                  <textarea rows={3} value={fields.meta_description ?? ''} maxLength={160}
                    onChange={(e) => set('meta_description', e.target.value)}
                    className={`${INPUT_CLS} resize-none`}
                    placeholder="Découvrez nos produits de qualité livrés rapidement à Dakar. Vêtements, alimentation, cosmétiques…" />
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Le texte affiché sous votre titre dans Google. Il doit donner envie de cliquer.
                    Idéal entre <strong>120 et 160 caractères</strong>. Décrivez ce que vous vendez et votre zone de livraison.
                  </p>
                </div>

                {/* ── Google Analytics ───────────────────────────────────── */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Google Analytics ID</label>
                  <input type="text" value={fields.google_analytics_id ?? ''}
                    onChange={(e) => set('google_analytics_id', e.target.value.toUpperCase())}
                    className={`${INPUT_CLS} ${!gaValid ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                    placeholder="G-XXXXXXXXXX" />
                  {!gaValid && (
                    <p className="mt-1 text-xs text-red-500">Format invalide — doit ressembler à G-AB12CD34EF</p>
                  )}
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Permet de suivre les visiteurs de votre boutique dans Google Analytics.
                    Trouvez votre ID dans{' '}
                    <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer"
                      className="text-brand-primary underline">
                      Google Analytics
                    </a>
                    {' '}→ Admin → Flux de données → votre site → ID de mesure.
                  </p>
                </div>

                {/* ── Pied de page ───────────────────────────────────────── */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Texte de pied de page</label>
                  <input type="text" value={fields.footer_text ?? ''}
                    onChange={(e) => set('footer_text', e.target.value)}
                    className={INPUT_CLS} placeholder={`© ${new Date().getFullYear()} ${fields.shop_name || 'Ma boutique'}. Tous droits réservés.`} />
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Affiché en bas de votre boutique. Généralement vos mentions légales ou copyright.
                  </p>
                </div>
              </>
            )
          })()}

          {/* ── Confiance ────────────────────────────────────────────── */}
          {tab === 'trust' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ces badges s'affichent sur la page d'accueil de votre boutique.
                Personnalisez le texte selon votre offre et votre pays.
              </p>
              {badges.map((badge, i) => (
                <div key={badge.icon} className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  {/* Toggle actif */}
                  <label className="mt-1 relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label={`Activer le badge "${badge.title}"`}
                      checked={badge.active}
                      onChange={(e) => setBadges((prev) => prev.map((b, idx) => idx === i ? { ...b, active: e.target.checked } : b))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-checked:bg-gray-900 dark:peer-checked:bg-gray-300 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-gray-900" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </label>

                  {/* Icône */}
                  <span className="mt-1 text-xl shrink-0" aria-hidden="true">
                    {BADGE_ICONS[badge.icon]}
                  </span>

                  {/* Champs */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Titre">
                      <input
                        type="text"
                        value={badge.title}
                        maxLength={60}
                        onChange={(e) => setBadges((prev) => prev.map((b, idx) => idx === i ? { ...b, title: e.target.value } : b))}
                        className={INPUT_CLS}
                        placeholder="Livraison rapide"
                      />
                    </Field>
                    <Field label="Sous-titre">
                      <input
                        type="text"
                        value={badge.subtitle ?? ''}
                        maxLength={100}
                        onChange={(e) => setBadges((prev) => prev.map((b, idx) => idx === i ? { ...b, subtitle: e.target.value } : b))}
                        className={INPUT_CLS}
                        placeholder="Partout au Mali"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── PROMOS ──────────────────────────────────────────────── */}
          {tab === 'promo' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Blocs promotionnels</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Affichés entre le hero et les sections produits. Maximum 4 blocs.
                    Chaque bloc peut avoir une image de fond ou une couleur.
                  </p>
                </div>
                {promoBlocks.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setPromoBlocks((prev) => [...prev, { ...DEFAULT_PROMO_BLOCK }])}
                    className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <span className="text-base leading-none">+</span>
                    Ajouter
                  </button>
                )}
              </div>

              {promoBlocks.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-10 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Aucun bloc promo — cliquez sur "Ajouter" pour créer le premier.
                  </p>
                </div>
              )}

              {promoBlocks.map((block, i) => {
                const imgPreview = promoImages[i]
                  ? URL.createObjectURL(promoImages[i]!)
                  : block.image_url

                const updateBlock = (patch: Partial<PromoBlock>) =>
                  setPromoBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b))

                return (
                  <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Preview carte */}
                    <div
                      className="relative h-36 overflow-hidden"
                      style={{ backgroundColor: block.color || '#111827' }}
                    >
                      {imgPreview && (
                        <img src={imgPreview} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                      <div className="relative z-10 flex flex-col justify-between h-full p-4">
                        <div className="flex items-start justify-between">
                          {block.emoji && (
                            <span className="text-2xl leading-none drop-shadow" aria-hidden="true">{block.emoji}</span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-white font-bold text-sm leading-snug drop-shadow">{block.title || 'Titre du bloc'}</p>
                          {block.subtitle && (
                            <p className="text-white/85 text-xs drop-shadow">{block.subtitle}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Champs */}
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Titre *">
                          <input
                            type="text"
                            value={block.title}
                            maxLength={60}
                            onChange={(e) => updateBlock({ title: e.target.value })}
                            className={INPUT_CLS}
                            placeholder="Promotions en cours"
                          />
                        </Field>
                        <Field label="Sous-titre">
                          <input
                            type="text"
                            value={block.subtitle ?? ''}
                            maxLength={80}
                            onChange={(e) => updateBlock({ subtitle: e.target.value })}
                            className={INPUT_CLS}
                            placeholder="Jusqu'à -50%"
                          />
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Emoji">
                          <input
                            type="text"
                            value={block.emoji}
                            maxLength={4}
                            onChange={(e) => updateBlock({ emoji: e.target.value })}
                            className={`${INPUT_CLS} text-center text-xl`}
                            placeholder="🔥"
                          />
                        </Field>
                        <Field label="Couleur de fond">
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={block.color || '#111827'}
                              onChange={(e) => updateBlock({ color: e.target.value })}
                              aria-label="Couleur de fond"
                              className="h-10 w-14 rounded-lg border border-gray-200 p-1 cursor-pointer"
                            />
                            <span className="text-xs font-mono text-gray-500">{block.color}</span>
                          </div>
                        </Field>
                        <Field label="Lien">
                          <input
                            type="text"
                            value={block.link}
                            onChange={(e) => updateBlock({ link: e.target.value })}
                            className={INPUT_CLS}
                            placeholder="?on_sale=1"
                          />
                        </Field>
                      </div>

                      <Field label="Image de fond (surpasse la couleur)">
                        <div className="flex items-center gap-3">
                          <input
                            ref={promoImageRefs[i]}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            aria-label={`Image du bloc promo ${i + 1}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null
                              setPromoImages((prev) => {
                                const next = [...prev]
                                next[i] = file
                                return next
                              })
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => promoImageRefs[i].current?.click()}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {imgPreview ? 'Changer l\'image' : 'Ajouter une image'}
                          </button>
                          {imgPreview && (
                            <button
                              type="button"
                              onClick={() => {
                                updateBlock({ image_url: null })
                                setPromoImages((prev) => {
                                  const next = [...prev]
                                  next[i] = null
                                  return next
                                })
                              }}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Supprimer l'image
                            </button>
                          )}
                        </div>
                      </Field>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeletePromoBlock(i)}
                          disabled={saveMutation.isPending}
                          className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                        >
                          {saveMutation.isPending ? 'Suppression…' : 'Supprimer ce bloc'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
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

const INPUT_CLS = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
    </div>
  )
}
