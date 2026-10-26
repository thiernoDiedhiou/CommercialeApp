import { useNavigate } from 'react-router-dom'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import type { ShopCategory } from '@/shop/services/shop'
import { getCategoryIcon } from '@/shop/utils/categoryIcons'

interface Props {
  categories : ShopCategory[]
  slug       : string
}

// Couleur d'icône stable par catégorie
const ICON_COLORS = [
  '#FF6B35', '#0984E3', '#00B894', '#6C5CE7',
  '#E84393', '#E6A817', '#00A8A3', '#D63031',
]
function colorFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return ICON_COLORS[h % ICON_COLORS.length]
}

export default function CategoryGrid({ categories, slug }: Props) {
  const navigate = useNavigate()

  if (categories.length === 0) return null

  // On coupe en 2 colonnes sur desktop, 1 colonne sur mobile
  const mid  = Math.ceil(categories.length / 2)
  const left  = categories.slice(0, mid)
  const right = categories.slice(mid)

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Nos rayons
      </h2>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Colonne gauche */}
          <div className="divide-y divide-gray-50">
            {left.map((cat) => <CategoryRow key={cat.id} cat={cat} slug={slug} navigate={navigate} />)}
          </div>

          {/* Colonne droite (cachée sur mobile) */}
          <div className="hidden sm:block divide-y divide-gray-50 border-l border-gray-100">
            {right.map((cat) => <CategoryRow key={cat.id} cat={cat} slug={slug} navigate={navigate} />)}
          </div>

          {/* Colonne droite visible uniquement sur mobile (suite) */}
          <div className="sm:hidden divide-y divide-gray-50 border-t border-gray-100">
            {right.map((cat) => <CategoryRow key={cat.id} cat={cat} slug={slug} navigate={navigate} />)}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Ligne de catégorie (style Jumia) ─────────────────────────────────────────

function CategoryRow({
  cat, slug, navigate,
}: {
  cat     : ShopCategory
  slug    : string
  navigate: ReturnType<typeof useNavigate>
}) {
  const CatIcon = getCategoryIcon(cat.name)
  const color   = colorFor(cat.name)

  return (
    <button
      type="button"
      onClick={() => navigate(`/shop/${slug}/catalog?category=${cat.id}`)}
      className="group w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
    >
      {/* Icône colorée */}
      <span
        className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}18` }}
      >
        <CatIcon className="h-4 w-4" style={{ color }} />
      </span>

      {/* Nom */}
      <span className="flex-1 text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate">
        {cat.name}
      </span>

      {/* Compteur */}
      {(cat.products_count ?? 0) > 0 && (
        <span className="shrink-0 text-xs text-gray-400 font-medium">
          {cat.products_count}
        </span>
      )}

      {/* Flèche */}
      <ChevronRightIcon className="shrink-0 h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
    </button>
  )
}
