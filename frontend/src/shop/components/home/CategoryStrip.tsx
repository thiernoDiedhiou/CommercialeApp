import type { ShopCategory } from '@/shop/services/shop'

interface Props {
  categories : ShopCategory[]
  selectedId : number | null
  onSelect   : (id: number | null) => void
}

export default function CategoryStrip({ categories, selectedId, onSelect }: Props) {
  if (categories.length === 0) return null

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">

          {/* Pill "Tous" */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedId === null
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={selectedId === null
              ? { backgroundColor: 'var(--shop-primary, #111827)' }
              : undefined
            }
          >
            Tous
          </button>

          {/* Pills catégories */}
          {categories.map((cat) => {
            const isSelected = selectedId === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={isSelected
                  ? { backgroundColor: 'var(--shop-primary, #111827)' }
                  : undefined
                }
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
