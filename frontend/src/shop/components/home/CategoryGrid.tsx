import { useNavigate } from 'react-router-dom'
import type { ShopCategory } from '@/shop/services/shop'
import { getCategoryIcon } from '@/shop/utils/categoryIcons'

interface Props {
  categories : ShopCategory[]
  slug       : string
}

// Palette douce — fond clair, icône colorée (style Jumia / Shopee)
const PALETTE: Array<{ bg: string; icon: string }> = [
  { bg: '#FFF0E6', icon: '#FF6B35' },  // orange
  { bg: '#E6F4FF', icon: '#0984E3' },  // bleu
  { bg: '#E6FAF5', icon: '#00B894' },  // vert
  { bg: '#F0EEFF', icon: '#6C5CE7' },  // violet
  { bg: '#FFE6F3', icon: '#E84393' },  // rose
  { bg: '#FFF8E6', icon: '#E6A817' },  // ambre
  { bg: '#E6FFFE', icon: '#00A8A3' },  // teal
  { bg: '#FFE8E8', icon: '#D63031' },  // rouge
  { bg: '#E8F5FF', icon: '#0077C8' },  // bleu marine
  { bg: '#FFF6E0', icon: '#B07D00' },  // doré
]

function paletteFor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export default function CategoryGrid({ categories, slug }: Props) {
  const navigate = useNavigate()

  if (categories.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Nos rayons</h2>

      {/* Strip horizontal scrollable — wrap sur desktop */}
      <div className="flex flex-wrap gap-x-3 gap-y-4 sm:gap-x-4 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((cat) => {
          const CatIcon = getCategoryIcon(cat.name)
          const { bg, icon } = paletteFor(cat.name)

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/shop/${slug}/catalog?category=${cat.id}`)}
              className="group flex flex-col items-center gap-1.5 w-[4.5rem] sm:w-20 shrink-0 focus:outline-none"
            >
              {/* Bulle icône */}
              <div
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: bg }}
              >
                <CatIcon className="h-7 w-7 sm:h-8 sm:w-8" style={{ color: icon }} />
              </div>

              {/* Nom */}
              <span className="text-[10px] sm:text-[11px] font-medium text-gray-600 text-center leading-tight line-clamp-2 group-hover:text-gray-900 transition-colors">
                {cat.name}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
