import type { ShopCategory } from '@/shop/services/shop'

interface Props {
  categories : ShopCategory[]
  selectedId : number | null
  onSelect   : (id: number | null) => void
}

const PALETTE = [
  'bg-orange-100 text-orange-600',
  'bg-blue-100 text-blue-600',
  'bg-emerald-100 text-emerald-600',
  'bg-purple-100 text-purple-600',
  'bg-rose-100 text-rose-600',
  'bg-amber-100 text-amber-600',
  'bg-teal-100 text-teal-600',
  'bg-indigo-100 text-indigo-600',
]

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">

          {/* Tuile "Tous" */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 flex flex-col items-center gap-1.5 focus:outline-none group w-20"
          >
            <div className={`h-16 w-20 rounded-2xl flex items-center justify-center transition-all duration-200 ${
              selectedId === null
                ? 'bg-[var(--shop-secondary,#374151)] ring-2 ring-[var(--shop-secondary,#374151)] ring-offset-2 scale-105'
                : 'bg-gray-100 group-hover:bg-gray-200'
            }`}>
              <span className={selectedId === null ? 'text-white' : 'text-gray-500'}>
                <IconGrid />
              </span>
            </div>
            <span className={`text-xs font-medium leading-tight text-center w-full line-clamp-2 ${
              selectedId === null ? 'text-[var(--shop-secondary,#374151)]' : 'text-gray-600'
            }`}>
              Tous
            </span>
          </button>

          {/* Tuiles catégories */}
          {categories.map((cat, i) => {
            const isSelected = selectedId === cat.id
            const colorClass = PALETTE[i % PALETTE.length]

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.id)}
                className="shrink-0 flex flex-col items-center gap-1.5 focus:outline-none group w-20"
              >
                <div className={`h-16 w-20 rounded-2xl overflow-hidden transition-all duration-200 ${
                  isSelected
                    ? 'ring-2 ring-[var(--shop-secondary,#374151)] ring-offset-2 scale-105'
                    : 'group-hover:scale-105'
                }`}>
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className={`h-full w-full flex items-center justify-center ${colorClass}`}>
                      <span className="text-xl font-bold">
                        {cat.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <span className={`text-xs font-medium leading-tight text-center w-full line-clamp-2 ${
                  isSelected ? 'text-[var(--shop-secondary,#374151)]' : 'text-gray-600'
                }`}>
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
