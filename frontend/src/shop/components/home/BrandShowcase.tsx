import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { useShopStore } from '@/shop/store/shopStore'

const GROTESK: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }
const JAKARTA: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" }

export default function BrandShowcase() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate      = useNavigate()
  const shopConfig    = useShopStore((s) => s.shopConfig)

  // Seuls les blocs AVEC image_url deviennent des showcase cards
  const showcaseBlocks = (shopConfig?.promo_blocks ?? []).filter((b) => !!b.image_url && b.title.trim())

  if (showcaseBlocks.length < 1) return null

  const handleClick = (link: string) => {
    if (!link) return
    if (link.startsWith('?') || link.startsWith('/shop/')) {
      navigate(link.startsWith('?') ? `/shop/${slug}/catalog${link}` : link)
    } else {
      window.open(link, '_blank', 'noopener')
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-14">
      <div className={`grid gap-4 ${showcaseBlocks.length >= 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {showcaseBlocks.slice(0, 2).map((block, i) => {
          const isDark = i === 0
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(block.link)}
              className="group relative rounded-2xl overflow-hidden min-h-[260px] flex flex-col justify-between text-left transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-2xl active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--shop-primary,#006948)]"
            >
              {/* Image de fond */}
              <img
                src={block.image_url!}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />

              {/* Overlay dégradé */}
              <div
                className="absolute inset-0"
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.4) 100%)'
                    : 'linear-gradient(135deg, rgba(0,105,72,0.8) 0%, rgba(15,23,42,0.3) 100%)',
                }}
              />

              {/* Halo décoratif */}
              <div
                className="absolute -bottom-12 -right-12 w-56 h-56 rounded-full pointer-events-none opacity-30"
                style={{ background: isDark ? 'rgba(104,219,169,0.4)' : 'rgba(255,255,255,0.3)', filter: 'blur(48px)' }}
              />

              {/* Contenu */}
              <div className="relative z-10 flex flex-col justify-between h-full p-6 sm:p-8 space-y-6">
                {/* En-tête */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    {block.emoji && (
                      <span className="text-2xl" aria-hidden="true">{block.emoji}</span>
                    )}
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest text-white"
                      style={JAKARTA}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-white/80"
                        style={{ boxShadow: '0 0 4px 2px rgba(255,255,255,0.3)' }}
                      />
                      Partenaire officiel
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all group-hover:bg-white/25">
                    <ArrowRightIcon className="h-4 w-4 text-white transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>

                {/* Texte principal */}
                <div className="space-y-2">
                  <h3
                    className="text-2xl sm:text-3xl font-bold text-white leading-snug"
                    style={{ ...GROTESK, letterSpacing: '-0.02em', textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}
                  >
                    {block.title}
                  </h3>
                  {block.subtitle && (
                    <p className="text-sm text-white/80 leading-relaxed" style={JAKARTA}>
                      {block.subtitle}
                    </p>
                  )}
                </div>

                {/* CTA bas */}
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      ...JAKARTA,
                      background: isDark ? 'rgba(104,219,169,0.9)' : 'rgba(255,255,255,0.9)',
                      color     : isDark ? '#002114' : 'var(--shop-primary,#006948)',
                    }}
                  >
                    Découvrir
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50" style={JAKARTA}>
                    Disponibilité immédiate
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
