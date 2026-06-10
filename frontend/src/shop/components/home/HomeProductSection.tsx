import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getShopProducts } from '@/shop/services/shop'
import ShopProductCard from '@/shop/components/catalog/ShopProductCard'

interface Props {
  slug     : string
  title    : string
  sort     : 'newest' | 'best_sellers'
  limit?   : number
  seeAllTo?: string
  onSale?  : boolean
}

function SkeletonCard() {
  return (
    <div className="shrink-0 w-44">
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
        <div className="aspect-square animate-pulse bg-gray-200" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="h-8 bg-gray-200 rounded-xl animate-pulse mt-2" />
        </div>
      </div>
    </div>
  )
}

export default function HomeProductSection({ slug, title, sort, limit = 10, seeAllTo, onSale }: Props) {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey : ['shop-home-section', slug, sort, onSale],
    queryFn  : () => getShopProducts(slug, { sort, per_page: limit, on_sale: onSale }),
    staleTime: 5 * 60 * 1000,
  })

  const products = data?.data ?? []

  if (!isLoading && products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {seeAllTo && (
          <button
            type="button"
            onClick={() => navigate(seeAllTo)}
            className="text-sm font-medium text-[var(--shop-primary,#111827)] hover:underline"
          >
            Voir tout →
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {products.map((product) => (
            <div key={product.id} className="shrink-0 w-44">
              <ShopProductCard product={product} slug={slug} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
