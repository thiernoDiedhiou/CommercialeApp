import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { useShopStore } from '@/shop/store/shopStore'

const GROTESK: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }
const JAKARTA: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" }

// SVG WhatsApp inline (pas de dépendance supplémentaire)
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="#25D366" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

interface Props {
  title         : string | null
  subtitle      : string | null
  bannerUrl     : string | null
  onCatalogClick: () => void
}

export default function HeroBanner({ title, subtitle, bannerUrl, onCatalogClick }: Props) {
  const shopConfig     = useShopStore((s) => s.shopConfig)
  const whatsappNumber = shopConfig?.whatsapp_number?.replace(/[^0-9]/g, '') ?? null
  const activeBadges   = (shopConfig?.trust_badges ?? []).filter((b) => b.active)

  if (!title && !bannerUrl) return null

  // ── Desktop Hero ──────────────────────────────────────────────────────────────
  const DesktopHero = (
    <section className="hidden sm:flex relative min-h-[560px] items-center bg-slate-900 overflow-hidden -mt-px">
      {/* Fond image avec blend luminosity */}
      {bannerUrl && (
        <>
          <img
            src={bannerUrl}
            alt=""
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/85 to-slate-900/30" />
        </>
      )}
      {!bannerUrl && (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, var(--shop-primary,#006948) 0%, #0f172a 60%)' }}
        />
      )}

      {/* Halo émeraude décoratif */}
      <div
        className="absolute -right-32 -top-32 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{ background: 'rgba(6,150,100,0.12)', filter: 'blur(80px)' }}
      />

      {/* Contenu */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full py-20 lg:py-24">
        {/* Badge arrivage / nom boutique */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold text-emerald-300 uppercase tracking-widest mb-5"
          style={GROTESK}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          {shopConfig?.name ?? 'Boutique en ligne'}
        </div>

        {/* Titre h1 */}
        {title && (
          <h1
            className="text-5xl lg:text-[56px] font-bold text-white max-w-2xl leading-[1.1] mb-4"
            style={{ ...GROTESK, letterSpacing: '-0.03em' }}
          >
            {title}
          </h1>
        )}

        {/* Sous-titre */}
        {subtitle && (
          <p
            className="text-lg text-white/70 max-w-xl mb-8 leading-relaxed"
            style={JAKARTA}
          >
            {subtitle}
          </p>
        )}

        {/* Boutons CTA */}
        <div className="flex flex-wrap items-center gap-3 mb-10">
          <button
            type="button"
            onClick={onCatalogClick}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
            style={{ ...JAKARTA, background: 'var(--shop-primary,#006948)' }}
          >
            Explorer le catalogue
            <ArrowRightIcon className="h-4 w-4" />
          </button>

          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all"
              style={JAKARTA}
            >
              <WhatsAppIcon />
              Devis WhatsApp
            </a>
          )}
        </div>

        {/* Strip métriques à partir des badges trust */}
        {activeBadges.length > 0 && (
          <div className="grid grid-cols-3 gap-6 max-w-xs pt-2 border-t border-white/10">
            {activeBadges.slice(0, 3).map((b, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <span
                  className="text-xl font-bold text-white/90"
                  style={GROTESK}
                >
                  ✓
                </span>
                <span
                  className="text-[11px] text-white/55 leading-snug"
                  style={JAKARTA}
                >
                  {b.subtitle ?? b.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )

  // ── Mobile Hero (carte arrondie) ──────────────────────────────────────────────
  const MobileHero = (
    <div className="sm:hidden px-3 pt-2 pb-1">
      <div className="relative rounded-3xl overflow-hidden min-h-[340px] flex flex-col justify-end shadow-lg">
        {/* Fond */}
        {bannerUrl ? (
          <>
            <img
              src={bannerUrl}
              alt=""
              loading="eager"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.88) 100%)' }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(160deg, var(--shop-primary,#006948) 0%, #0f172a 100%)' }}
          />
        )}

        {/* Contenu */}
        <div className="relative z-10 p-6 pb-8 space-y-3">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-bold text-white/90 uppercase tracking-wider"
            style={GROTESK}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {shopConfig?.name ?? 'Nouveautés'}
          </div>

          {title && (
            <h1
              className="text-[28px] font-bold text-white leading-tight"
              style={{ ...GROTESK, letterSpacing: '-0.02em' }}
            >
              {title}
            </h1>
          )}

          {subtitle && (
            <p
              className="text-sm text-white/70 line-clamp-2"
              style={JAKARTA}
            >
              {subtitle}
            </p>
          )}

          <button
            type="button"
            onClick={onCatalogClick}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all text-center flex items-center justify-center gap-2"
            style={{ ...JAKARTA, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            Voir le catalogue
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {DesktopHero}
      {MobileHero}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
