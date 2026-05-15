interface SkeletonGridProps {
  count?: number
}

function ProductSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100">
      {/* Image placeholder */}
      <div className="aspect-square animate-pulse bg-gray-200" />

      {/* Infos */}
      <div className="p-3 space-y-2">
        {/* Nom produit */}
        <div className="h-4 w-3/4 animate-pulse bg-gray-200 rounded" />
        {/* Prix */}
        <div className="h-4 w-1/2 animate-pulse bg-gray-200 rounded" />
        {/* Bouton */}
        <div className="h-8 w-full animate-pulse bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 8 }: SkeletonGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  )
}

export default ProductSkeleton
