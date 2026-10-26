import { useNavigate } from 'react-router-dom'
import type { ShopCategory } from '@/shop/services/shop'
import { getCategoryIcon } from '@/shop/utils/categoryIcons'

interface Props {
  categories : ShopCategory[]
  slug       : string
}

export default function CategoryGrid({ categories, slug }: Props) {
  const navigate = useNavigate()

  if (categories.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-lg font-bold text-gray-900 mb-5">Nos rayons</h2>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
        {categories.map((cat) => {
          const CatIcon = getCategoryIcon(cat.name)

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/shop/${slug}/catalog?category=${cat.id}`)}
              className="group flex flex-col items-center gap-2 focus:outline-none"
            >
              {/* Vignette */}
              <div className="relative w-full aspect-square overflow-hidden rounded-2xl transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
                {cat.image_url ? (
                  <>
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    {/* Compteur */}
                    {(cat.products_count ?? 0) > 0 && (
                      <span className="absolute top-1.5 right-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-gray-800 shadow">
                        {cat.products_count}
                      </span>
                    )}
                  </>
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, var(--shop-primary,#111827) 0%, var(--shop-secondary,#374151) 100%)',
                    }}
                  >
                    <CatIcon className="h-8 w-8 text-white/90" />
                    {/* Compteur */}
                    {(cat.products_count ?? 0) > 0 && (
                      <span className="absolute top-1.5 right-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-gray-800 shadow">
                        {cat.products_count}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Nom */}
              <span className="text-[11px] sm:text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2 w-full group-hover:text-[var(--shop-primary,#111827)] transition-colors">
                {cat.name}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
