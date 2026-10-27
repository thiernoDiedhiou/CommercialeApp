import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useShopStore } from '@/shop/store/shopStore'

interface Props { slug: string }

const JAKARTA: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" }
const GROTESK: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }

// ── Icônes réseaux sociaux ────────────────────────────────────────────────────

function IcoFacebook()  { return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> }
function IcoInstagram() { return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162S8.597 18.163 12 18.163s6.162-2.759 6.162-6.162S15.403 5.838 12 5.838zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg> }
function IcoTwitter()   { return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> }
function IcoTikTok()    { return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.75a4.85 4.85 0 01-1.02-.06z" /></svg> }
function IcoYouTube()   { return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg> }
function IcoWhatsApp()  { return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg> }
function IcoLocation()  { return <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
function IcoClock()     { return <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg> }
function IcoArrowRight(){ return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg> }

const SOCIAL_ITEMS = [
  { key: 'facebook_url',  Icon: IcoFacebook,  label: 'Facebook'    },
  { key: 'instagram_url', Icon: IcoInstagram, label: 'Instagram'   },
  { key: 'twitter_url',   Icon: IcoTwitter,   label: 'Twitter / X' },
  { key: 'tiktok_url',    Icon: IcoTikTok,    label: 'TikTok'      },
  { key: 'youtube_url',   Icon: IcoYouTube,   label: 'YouTube'     },
] as const

// Couleur dot par mot-clé dans le nom du moyen de paiement
function methodDot(m: string) {
  if (/wave/i.test(m))          return 'bg-blue-500'
  if (/orange/i.test(m))        return 'bg-orange-500'
  if (/moov|mtn/i.test(m))      return 'bg-yellow-500'
  if (/free/i.test(m))          return 'bg-red-500'
  if (/cash|livraison/i.test(m)) return 'bg-emerald-500'
  return 'bg-slate-400'
}

// Accordéon mobile pour les colonnes footer
function FooterAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/10 lg:border-none">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3 lg:py-0 lg:cursor-default lg:pointer-events-none"
      >
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest" style={JAKARTA}>{title}</h3>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 lg:hidden text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-200 lg:block lg:mt-4 ${open ? 'max-h-80 pb-3' : 'max-h-0 lg:max-h-none'}`}>
        {children}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ShopFooter({ slug }: Props) {
  const shopConfig = useShopStore((s) => s.shopConfig)

  const waNumber   = shopConfig?.whatsapp_number?.replace(/[^0-9]/g, '') ?? null
  const year       = new Date().getFullYear()
  const appName    = import.meta.env.VITE_APP_NAME ?? 'DiDi Sphere'
  const methods    = shopConfig?.payment_methods ?? ['Wave', 'Orange Money', 'Moov Money', 'Cash Livraison']
  const hasSocials = SOCIAL_ITEMS.some(({ key }) => !!shopConfig?.[key])

  return (
    <footer className="bg-slate-900 text-white mt-12 sm:mt-16">

      {/* ── Bande newsletter ─────────────────────────────────────────────────── */}
      <div className="bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white" style={GROTESK}>
              Restez informé des nouveautés &amp; offres exclusives
            </h4>
            <p className="text-sm text-slate-400" style={JAKARTA}>
              Recevez nos alertes arrivages, promotions flash et tarifs pros.
            </p>
          </div>
          <form
            className="flex items-center gap-2 w-full lg:w-auto lg:min-w-[380px]"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="Votre adresse email…"
              className="flex-1 h-11 px-4 rounded-xl bg-slate-700 text-white placeholder:text-slate-500 text-sm border border-slate-600 focus:outline-none focus:border-[var(--shop-primary,#006948)] transition-colors"
              style={JAKARTA}
            />
            <button
              type="submit"
              className="h-11 px-5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 shrink-0"
              style={{ ...JAKARTA, background: 'var(--shop-primary,#006948)' }}
            >
              S'inscrire
            </button>
          </form>
        </div>
      </div>

      {/* ── Corps footer — 4 colonnes ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 lg:gap-10">

          {/* Colonne 1 — Identité + socials (2/5 de la largeur) */}
          <div className="lg:col-span-2 flex flex-col gap-5 pb-6 lg:pb-0 border-b border-white/10 lg:border-none">
            {/* Logo ou nom */}
            <Link to={`/shop/${slug}`} className="inline-block">
              {shopConfig?.logo_url ? (
                <div className="inline-flex items-center bg-white/10 rounded-xl px-3 py-2">
                  <img src={shopConfig.logo_url} alt={shopConfig.name} className="max-h-10 w-auto object-contain" />
                </div>
              ) : (
                <span className="text-xl font-bold text-white" style={GROTESK}>{shopConfig?.name}</span>
              )}
            </Link>

            {shopConfig?.description && (
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm" style={JAKARTA}>
                {shopConfig.description}
              </p>
            )}

            {/* Coordonnées */}
            <div className="flex flex-col gap-2 text-sm text-slate-400" style={JAKARTA}>
              {shopConfig?.address && (
                <span className="flex items-start gap-2">
                  <IcoLocation />
                  <span className="leading-relaxed">{shopConfig.address}</span>
                </span>
              )}
              {shopConfig?.opening_hours && (
                <span className="flex items-start gap-2">
                  <IcoClock />
                  <span className="leading-relaxed whitespace-pre-line">{shopConfig.opening_hours}</span>
                </span>
              )}
              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  <IcoWhatsApp />
                  {shopConfig?.whatsapp_number}
                </a>
              )}
            </div>

            {/* Réseaux sociaux */}
            {hasSocials && (
              <div className="flex flex-wrap gap-2">
                {SOCIAL_ITEMS.map(({ key, Icon, label }) =>
                  shopConfig?.[key] ? (
                    <a
                      key={key}
                      href={shopConfig[key]!}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Icon />
                    </a>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* Colonne 2 — Catalogue */}
          <FooterAccordion title="Catalogue">
            <nav className="flex flex-col gap-2.5" style={JAKARTA}>
              {[
                { to: `/shop/${slug}`,             label: 'Accueil boutique'   },
                { to: `/shop/${slug}/catalog`,      label: 'Tous les produits'  },
                { to: `/shop/${slug}/catalog?on_sale=1`, label: 'Promotions'    },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
                >
                  <IcoArrowRight />
                  {label}
                </Link>
              ))}
            </nav>
          </FooterAccordion>

          {/* Colonne 3 — Services */}
          <FooterAccordion title="Services">
            <div className="flex flex-col gap-2.5 text-sm text-slate-400" style={JAKARTA}>
              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Bonjour, je souhaite un devis.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <IcoArrowRight />
                  Demande de devis
                </a>
              )}
              <span className="flex items-center gap-2">
                <IcoArrowRight />
                Suivi de commande
              </span>
              <span className="flex items-center gap-2">
                <IcoArrowRight />
                Garantie &amp; Retours
              </span>
              <span className="flex items-center gap-2">
                <IcoArrowRight />
                Livraison
              </span>
            </div>
          </FooterAccordion>

          {/* Colonne 4 — Paiement */}
          <FooterAccordion title="Paiement accepté">
            <div className="flex flex-col gap-2.5" style={JAKARTA}>
              {methods.map((m) => (
                <div key={m} className="flex items-center gap-2 text-sm text-slate-400">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${methodDot(m)}`} />
                  {m}
                </div>
              ))}
            </div>
          </FooterAccordion>

        </div>
      </div>

      {/* ── Barre de copyright ───────────────────────────────────────────────── */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500" style={JAKARTA}>
          <span>
            {shopConfig?.footer_text
              ? shopConfig.footer_text
              : `© ${year} ${shopConfig?.name ?? ''}. Tous droits réservés.`}
          </span>
          <span>
            Propulsé par <span className="text-slate-400 font-semibold">{appName}</span>
          </span>
        </div>
      </div>
    </footer>
  )
}
