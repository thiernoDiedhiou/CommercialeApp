import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getShopCategories } from '@/shop/services/shop'
import { useShopStore } from '@/shop/store/shopStore'
import { HeroBanner, CategoryStrip, TrustBadges, HomeProductSection } from '@/shop/components/home'
import { ProductGrid } from '@/shop/components/catalog'

export default function ShopHomePage() {
  const { slug = '' }  = useParams<{ slug: string }>()
  const navigate        = useNavigate()
  const shopConfig      = useShopStore((s) => s.shopConfig)
  const gridRef         = useRef<HTMLDivElement>(null)

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  const { data: categoriesResult } = useQuery({
    queryKey : ['shop-categories', slug],
    queryFn  : () => getShopCategories(slug),
    staleTime: 5 * 60 * 1000,
    enabled  : !!slug,
  })

  const categories = categoriesResult?.data ?? []

  const selectedName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name ?? 'Produits'
    : 'Tout notre catalogue'

  const handleCategorySelect = (id: number | null) => {
    setSelectedCategory(id)
    // Scroll vers la grille uniquement quand une catégorie est sélectionnée
    if (id !== null) {
      setTimeout(() => {
        gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }

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
          onSelect={handleCategorySelect}
        />
      )}

      {/* ── Trust badges ──────────────────────────────────────────────────── */}
      <TrustBadges />

      {/* ── Offres du moment (masquée si aucun produit en promo) ─────────── */}
      <HomeProductSection
        slug={slug}
        title="🔥 Offres du moment"
        sort="newest"
        onSale={true}
        seeAllTo={`/shop/${slug}/catalog?on_sale=1`}
      />

      {/* ── Nouveaux arrivages ────────────────────────────────────────────── */}
      <HomeProductSection
        slug={slug}
        title="Nouveaux arrivages"
        sort="newest"
        seeAllTo={`/shop/${slug}/catalog`}
      />

      {/* ── Meilleures ventes ─────────────────────────────────────────────── */}
      <HomeProductSection
        slug={slug}
        title="Meilleures ventes"
        sort="best_sellers"
        seeAllTo={`/shop/${slug}/catalog`}
      />

      {/* ── Grille produits ───────────────────────────────────────────────── */}
      <div ref={gridRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-20">
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
