import { useQuery } from '@tanstack/react-query'
import { getShopProducts } from '@/shop/services/shop'
import ShopProductCard from '@/shop/components/catalog/ShopProductCard'

interface Props {
  slug             : string
  categoryId       : number
  currentProductId : number
}

export default function SimilarProducts({ slug, categoryId, currentProductId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey : ['shop-similar', slug, categoryId, currentProductId],
    queryFn  : () => getShopProducts(slug, { category_id: categoryId, per_page: 10 }),
    staleTime: 5 * 60 * 1000,
  })

  const products = (data?.data ?? []).filter((p) => p.id !== currentProductId)

  if (!isLoading && products.length === 0) return null

  return (
    <section className="mt-12 pb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Produits similaires</h2>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-44">
              <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                <div className="aspect-square animate-pulse bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            </div>
          ))}
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
