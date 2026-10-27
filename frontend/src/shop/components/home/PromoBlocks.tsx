import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { useShopStore } from '@/shop/store/shopStore'

export default function PromoBlocks() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate    = useNavigate()
  const shopConfig  = useShopStore((s) => s.shopConfig)
  const promoBlocks = shopConfig?.promo_blocks ?? []

  const active = promoBlocks.filter((b) => b.title.trim())
  if (active.length === 0) return null

  const handleClick = (link: string) => {
    if (!link) return
    // Lien interne (commence par ?) ou chemin relatif
    if (link.startsWith('?') || link.startsWith('/shop/')) {
      const dest = link.startsWith('?')
        ? `/shop/${slug}/catalog${link}`
        : link
      navigate(dest)
    } else {
      window.open(link, '_blank', 'noopener')
    }
  }

  // Hauteur des cartes : plus haute quand il y a peu de blocs (donc plus larges)
  const cardHeight =
    active.length === 1 ? 'h-52 sm:h-64' :
    active.length === 2 ? 'h-44 sm:h-52' :
    'h-36 sm:h-44'

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-5">
      <div
        className={`grid gap-3 ${
          active.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
          active.length === 2 ? 'grid-cols-2' :
          active.length === 3 ? 'grid-cols-2 sm:grid-cols-3' :
          'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        {active.map((block, i) => {
          const hasImage = !!block.image_url
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(block.link)}
              className={`group relative overflow-hidden rounded-2xl text-left transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white ${cardHeight}`}
            >
              {/* Fond image ou couleur */}
              {hasImage ? (
                <img
                  src={block.image_url!}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: block.color || '#111827' }}
                />
              )}

              {/* Overlay dégradé sombre */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

              {/* Contenu */}
              <div className="relative z-10 flex flex-col justify-between h-full p-4">
                {/* Emoji + flèche */}
                <div className="flex items-start justify-between">
                  {block.emoji && (
                    <span className="text-2xl leading-none drop-shadow" aria-hidden="true">
                      {block.emoji}
                    </span>
                  )}
                  <ArrowRightIcon className="h-4 w-4 text-white/70 group-hover:text-white transition-colors ml-auto shrink-0" />
                </div>

                {/* Texte bas */}
                <div className="space-y-0.5">
                  <p className={`text-white font-bold leading-snug line-clamp-2 drop-shadow ${active.length === 1 ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
                    {block.title}
                  </p>
                  {block.subtitle && (
                    <p className="text-white/85 text-xs sm:text-sm font-medium line-clamp-1 drop-shadow">
                      {block.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
