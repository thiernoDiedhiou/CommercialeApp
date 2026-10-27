import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { getShopProducts } from '@/shop/services/shop'
import ShopProductCard from '@/shop/components/catalog/ShopProductCard'

const GROTESK: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }
const JAKARTA: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" }

interface Props {
  slug      : string
  title     : string
  sort      : 'newest' | 'best_sellers'
  limit?    : number
  seeAllTo? : string
  onSale?   : boolean
  variant?  : 'scroll' | 'grid'
  /** Petite étiquette colorée au-dessus du titre (ex: "PRIX EN BAISSE • QUANTITÉS LIMITÉES") */
  label?    : string
  /** Emoji ou texte devant le label */
  icon?     : string
  /** Couleur du label : red = offres, green = nouveautés, default = bleu/neutre */
  labelColor?: 'red' | 'green' | 'slate'
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="aspect-square animate-pulse bg-slate-100" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-slate-100 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
        <div className="h-9 bg-slate-100 rounded-xl animate-pulse mt-3" />
      </div>
    </div>
  )
}

const LABEL_CLASSES: Record<NonNullable<Props['labelColor']>, string> = {
  red  : 'text-red-500',
  green: 'text-emerald-600',
  slate: 'text-slate-500',
}

export default function HomeProductSection({
  slug, title, sort, limit = 10, seeAllTo, onSale,
  variant = 'scroll', label, icon, labelColor = 'slate',
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey : ['shop-home-section', slug, sort, onSale],
    queryFn  : () => getShopProducts(slug, { sort, per_page: limit, on_sale: onSale }),
    staleTime: 5 * 60 * 1000,
  })

  const products = data?.data ?? []

  if (!isLoading && products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">

      {/* ── En-tête section ────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between mb-5">
        <div className="space-y-1">
          {/* Étiquette colorée optionnelle */}
          {(label || icon) && (
            <div
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${LABEL_CLASSES[labelColor]}`}
              style={JAKARTA}
            >
              {icon && <span aria-hidden="true">{icon}</span>}
              {label && <span>{label}</span>}
            </div>
          )}

          {/* Titre principal */}
          <h2
            className="text-xl sm:text-2xl font-bold text-slate-900"
            style={{ ...GROTESK, letterSpacing: '-0.015em' }}
          >
            {title}
          </h2>
        </div>

        {/* Lien "Voir tout" */}
        {seeAllTo && (
          <Link
            to={seeAllTo}
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold transition-colors shrink-0 ml-4"
            style={{ ...JAKARTA, color: 'var(--shop-primary,#006948)' }}
          >
            Voir tout
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        variant === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shrink-0 w-44 sm:w-52">
                <SkeletonCard />
              </div>
            ))}
          </div>
        )
      ) : variant === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ShopProductCard key={product.id} product={product} slug={slug} />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {products.map((product) => (
            <div key={product.id} className="shrink-0 w-44 sm:w-52">
              <ShopProductCard product={product} slug={slug} />
            </div>
          ))}
        </div>
      )}

      {/* Lien "Voir tout" mobile (en bas de section) */}
      {seeAllTo && (
        <div className="sm:hidden flex justify-center mt-4">
          <Link
            to={seeAllTo}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
            style={{
              ...JAKARTA,
              color          : 'var(--shop-primary,#006948)',
              borderColor    : 'var(--shop-primary,#006948)',
            }}
          >
            Voir tout {title.replace(/^[^\w]+/, '')}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  )
}
