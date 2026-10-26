import { useNavigate } from 'react-router-dom'
import type { ShopCategory } from '@/shop/services/shop'
import { getCategoryIcon } from '@/shop/utils/categoryIcons'

interface Props {
  categories : ShopCategory[]
  slug       : string
}

// Palette de 10 couleurs distinctes — chaque catégorie en reçoit une de façon stable
const PALETTE: Array<[string, string]> = [
  ['#FF6B35', '#FF8E53'],  // orange vif
  ['#0984E3', '#74B9FF'],  // bleu
  ['#00B894', '#55EFC4'],  // vert émeraude
  ['#6C5CE7', '#A29BFE'],  // violet
  ['#E84393', '#FF6FB0'],  // rose
  ['#FDCB6E', '#E17055'],  // ambre → corail
  ['#2EC4B6', '#1A9E92'],  // teal foncé
  ['#D63031', '#FF7675'],  // rouge
  ['#00CEC9', '#81ECEC'],  // cyan
  ['#B8860B', '#F0A500'],  // doré
]

// Hachage stable du nom → index dans PALETTE (même catégorie = même couleur)
function paletteIndex(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % PALETTE.length
}

export default function CategoryGrid({ categories, slug }: Props) {
  const navigate = useNavigate()

  if (categories.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-lg font-bold text-gray-900 mb-5">Nos rayons</h2>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
        {categories.map((cat) => {
          const CatIcon  = getCategoryIcon(cat.name)
          const [from, to] = PALETTE[paletteIndex(cat.name)]
          const count    = cat.products_count ?? 0

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/shop/${slug}/catalog?category=${cat.id}`)}
              className="group flex flex-col items-center gap-1.5 focus:outline-none"
            >
              {/* Vignette carrée colorée */}
              <div
                className="relative w-full aspect-square rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-1.5 p-2 transition-all duration-300 group-hover:scale-[1.06] group-hover:shadow-lg"
                style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
              >
                {/* Icône avec halo */}
                <div className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/20">
                  <CatIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white drop-shadow" />
                </div>

                {/* Nom à l'intérieur */}
                <span className="text-[9px] sm:text-[10px] font-semibold text-white/95 text-center leading-tight line-clamp-2 px-0.5">
                  {cat.name}
                </span>

                {/* Badge compteur */}
                {count > 0 && (
                  <span className="absolute top-1.5 right-1.5 rounded-full bg-black/25 px-1 py-px text-[8px] font-bold text-white/95 leading-tight">
                    {count}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
