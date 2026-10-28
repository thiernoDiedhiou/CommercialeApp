import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRightIcon, ShoppingBagIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { useShopStore } from '@/shop/store/shopStore'
import { getShopProducts } from '@/shop/services/shop'

const GROTESK: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }
const JAKARTA: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" }

function WhatsAppIcon({ size = 4 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-${size} w-${size} shrink-0`} fill="#25D366" aria-hidden="true">
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
  const { slug = '' }  = useParams<{ slug: string }>()
  const navigate       = useNavigate()
  const shopConfig     = useShopStore((s) => s.shopConfig)
  const currency       = shopConfig?.currency ?? 'FCFA'
  const whatsappNumber = shopConfig?.whatsapp_number?.replace(/[^0-9]/g, '') ?? null
  const activeBadges   = (shopConfig?.trust_badges ?? []).filter((b) => b.active)

  // Produits vedettes : plusieurs promos pour le carousel automatique
  const { data: onSaleData } = useQuery({
    queryKey : ['hero-featured', slug],
    queryFn  : () => getShopProducts(slug, { sort: 'newest', per_page: 5, on_sale: true }),
    staleTime: 5 * 60 * 1000,
    enabled  : !!slug,
  })
  const featuredList = onSaleData?.data ?? []

  // Carousel auto-rotatif toutes les 4 secondes
  const [featuredIdx, setFeaturedIdx] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (featuredList.length <= 1) return
    const timer = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setFeaturedIdx((i) => (i + 1) % featuredList.length)
        setFading(false)
      }, 300)
    }, 4000)
    return () => clearInterval(timer)
  }, [featuredList.length])

  const featured = featuredList[featuredIdx] ?? null
  const featuredPromo = featured?.compare_at_price
    ? Math.round((1 - featured.price / featured.compare_at_price) * 100)
    : null

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
            className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent" />
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
        className="absolute -right-24 -top-24 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'rgba(0,105,72,0.2)', filter: 'blur(80px)' }}
      />

      {/* Layout 2 colonnes : texte gauche + carte vedette droite */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full py-16 lg:py-20 flex flex-col lg:flex-row items-center justify-between gap-10">

        {/* ── Colonne gauche — contenu textuel ─────────────────────────── */}
        <div className="max-w-2xl space-y-4">
          {/* Badge boutique / arrivage */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold text-emerald-300 uppercase tracking-widest"
            style={GROTESK}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            {shopConfig?.name ?? 'Boutique en ligne'}
          </div>

          {/* Titre h1 */}
          {title && (
            <h1
              className="text-5xl lg:text-[56px] font-bold text-white leading-[1.1]"
              style={{ ...GROTESK, letterSpacing: '-0.03em' }}
            >
              {title}
            </h1>
          )}

          {/* Sous-titre */}
          {subtitle && (
            <p className="text-lg text-slate-300 max-w-xl leading-relaxed" style={JAKARTA}>
              {subtitle}
            </p>
          )}

          {/* Boutons CTA */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
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
                Devis WhatsApp instantané
              </a>
            )}
          </div>

          {/* Strip métriques (trust badges) */}
          {activeBadges.length > 0 && (
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-white/10">
              {activeBadges.slice(0, 3).map((b, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span
                    className="text-xl font-bold leading-none"
                    style={{ ...GROTESK, color: i === 0 ? '#68dba9' : 'rgba(255,255,255,0.9)' }}
                  >
                    {b.title}
                  </span>
                  {b.subtitle && (
                    <span className="text-[11px] text-slate-400 leading-snug" style={JAKARTA}>
                      {b.subtitle}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Colonne droite — carousel produits vedettes ───────────────── */}
        {featured && (
          <div
            className="w-full lg:w-80 xl:w-96 shrink-0 rounded-2xl shadow-2xl p-5 space-y-4 hidden md:block"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {/* En-tête carte */}
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-bold uppercase tracking-widest text-slate-300"
                style={JAKARTA}
              >
                PROMOTION VEDETTE
              </span>
              {featuredPromo !== null && (
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-red-500"
                  style={JAKARTA}
                >
                  -{featuredPromo}% EXCLUSIF
                </span>
              )}
            </div>

            {/* Contenu animé (fade in/out) */}
            <div
              className="space-y-4 transition-opacity duration-300"
              style={{ opacity: fading ? 0 : 1 }}
            >
              {/* Image produit */}
              <div className="w-full h-44 rounded-xl overflow-hidden flex items-center justify-center p-3"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {featured.image_url ? (
                  <img
                    src={featured.image_url}
                    alt={featured.name}
                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-5xl font-bold text-white/20" style={GROTESK}>
                    {featured.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Infos produit */}
              <div>
                {featured.category && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400" style={JAKARTA}>
                    {featured.category.name}
                  </span>
                )}
                <h3 className="text-base font-semibold text-white mt-0.5 leading-snug line-clamp-2" style={GROTESK}>
                  {featured.name}
                </h3>
              </div>

              {/* Prix + CTA */}
              <div className="flex items-end justify-between pt-1">
                <div>
                  <span className="text-2xl font-bold leading-none" style={{ ...GROTESK, color: '#68dba9' }}>
                    {featured.price.toLocaleString('fr-FR')} {currency}
                  </span>
                  {featured.compare_at_price && (
                    <span className="block text-xs text-slate-400 line-through mt-0.5" style={JAKARTA}>
                      {featured.compare_at_price.toLocaleString('fr-FR')} {currency}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/shop/${slug}/products/${featured.uid}`)}
                  className="h-10 px-4 rounded-xl text-slate-900 font-semibold text-sm flex items-center gap-1.5 transition-all hover:opacity-90 active:scale-95"
                  style={{ ...JAKARTA, background: '#68dba9' }}
                >
                  <ShoppingBagIcon className="h-4 w-4 shrink-0" />
                  Voir
                </button>
              </div>
            </div>

            {/* Indicateurs de position (dots) — si plusieurs produits */}
            {featuredList.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {featuredList.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Produit ${i + 1}`}
                    onClick={() => { setFading(true); setTimeout(() => { setFeaturedIdx(i); setFading(false) }, 200) }}
                    className={`rounded-full transition-all duration-300 ${
                      i === featuredIdx
                        ? 'w-5 h-1.5 bg-emerald-400'
                        : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )

  // ── Mobile Hero (carte arrondie) ──────────────────────────────────────────────
  const MobileHero = (
    <div className="sm:hidden px-3 pt-2 pb-1">
      <div className="relative rounded-3xl overflow-hidden min-h-[340px] flex flex-col justify-end shadow-lg">
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

        <div className="relative z-10 p-6 pb-8 space-y-3">
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
            <p className="text-sm text-white/70 line-clamp-2" style={JAKARTA}>
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
    </>
  )
}
