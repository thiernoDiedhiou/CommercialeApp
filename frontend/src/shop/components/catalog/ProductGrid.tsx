import { useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { getShopProducts } from '@/shop/services/shop'
import { SkeletonGrid, EmptyState } from '@/shop/components/shared'
import ShopProductCard from './ShopProductCard'

interface Props {
  slug        : string
  categoryId  : number | null
  searchQuery : string
}

export default function ProductGrid({ slug, categoryId, searchQuery }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['shop-products', slug, categoryId, searchQuery],
    queryFn : ({ pageParam = 1 }) =>
      getShopProducts(slug, {
        category_id: categoryId ?? undefined,
        search     : searchQuery || undefined,
        page       : pageParam as number,
        per_page   : 12,
      }),
    initialPageParam  : 1,
    getNextPageParam  : (lastPage) =>
      lastPage.current_page < lastPage.last_page
        ? lastPage.current_page + 1
        : undefined,
    staleTime: 2 * 60 * 1000,
  })

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const products = data?.pages.flatMap((p) => p.data) ?? []

  if (isLoading) {
    return <SkeletonGrid count={12} />
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="Aucun produit trouvé"
        description="Essayez une autre recherche ou catégorie"
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {products.map((product) => (
          <ShopProductCard key={product.id} product={product} slug={slug} />
        ))}
      </div>

      {/* Sentinel pour l'infinite scroll */}
      <div ref={sentinelRef} className="h-4" />

      {/* Spinner chargement page suivante */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <div
            className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-gray-500 animate-spin"
            role="status"
            aria-label="Chargement"
          />
        </div>
      )}
    </>
  )
}
