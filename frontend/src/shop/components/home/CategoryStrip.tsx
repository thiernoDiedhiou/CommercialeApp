import type { ShopCategory } from '@/shop/services/shop'
import { getCategoryIcon } from '@/shop/utils/categoryIcons'

interface Props {
  categories : ShopCategory[]
  selectedId : number | null
  onSelect   : (id: number | null) => void
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

export default function CategoryStrip({ categories, selectedId, onSelect }: Props) {
  if (categories.length === 0) return null

  return (
    <div className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">

          {/* Tuile "Tous" */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 flex flex-col items-center gap-1 focus:outline-none group w-[60px]"
          >
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
              selectedId === null
                ? 'bg-[var(--shop-secondary,#374151)]'
                : 'bg-gray-100 group-hover:bg-gray-200'
            }`}>
              <span className={selectedId === null ? 'text-white' : 'text-gray-500'}>
                <IconGrid />
              </span>
            </div>
            <span className={`text-[11px] font-medium leading-tight text-center w-full truncate ${
              selectedId === null ? 'text-[var(--shop-secondary,#374151)]' : 'text-gray-500'
            }`}>
              Tous
            </span>
          </button>

          {/* Tuiles catégories */}
          {categories.map((cat) => {
            const isSelected = selectedId === cat.id
            const CatIcon    = getCategoryIcon(cat.name)

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.id)}
                className="shrink-0 flex flex-col items-center gap-1 focus:outline-none group w-[60px]"
              >
                <div className={`h-11 w-11 rounded-xl overflow-hidden transition-all duration-200 ${
                  isSelected
                    ? 'bg-[var(--shop-secondary,#374151)] ring-2 ring-[var(--shop-secondary,#374151)]'
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <CatIcon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium leading-tight text-center w-full truncate ${
                    isSelected ? 'text-[var(--shop-secondary,#374151)]' : 'text-gray-500'
                  }`}
                  title={cat.name}
                >
                  {cat.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
