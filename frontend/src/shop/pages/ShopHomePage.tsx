import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getShopCategories } from '@/shop/services/shop'
import { useShopStore } from '@/shop/store/shopStore'
import { HeroBanner, CategoryStrip } from '@/shop/components/home'
import { ProductGrid } from '@/shop/components/catalog'

export default function ShopHomePage() {
  const { slug = '' }  = useParams<{ slug: string }>()
  const navigate        = useNavigate()
  const shopConfig      = useShopStore((s) => s.shopConfig)

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  const { data: categoriesResult } = useQuery({
    queryKey : ['shop-categories', slug],
    queryFn  : () => getShopCategories(slug),
    staleTime: 5 * 60 * 1000,
    enabled  : !!slug,
  })

  const categories = categoriesResult?.data ?? []

  // Nom de la catégorie sélectionnée pour le titre de section
  const selectedName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name ?? 'Produits'
    : 'Nos produits'

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <HeroBanner
        title={shopConfig?.hero_title ?? null}
        subtitle={shopConfig?.hero_subtitle ?? null}
        bannerUrl={shopConfig?.hero_banner_url ?? null}
        onCatalogClick={() => navigate(`/shop/${slug}/catalog`)}
      />

      {/* ── Strip catégories ──────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <CategoryStrip
          categories={categories}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />
      )}

      {/* ── Grille produits ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {selectedName}
        </h2>

        <ProductGrid
          slug={slug}
          categoryId={selectedCategory}
          searchQuery=""
        />
      </div>
    </>
  )
}
