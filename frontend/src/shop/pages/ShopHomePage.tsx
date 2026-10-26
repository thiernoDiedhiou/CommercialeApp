import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getShopCategories } from '@/shop/services/shop'
import { useShopStore } from '@/shop/store/shopStore'
import { HeroBanner, CategoryGrid, TrustBadges, HomeProductSection } from '@/shop/components/home'

export default function ShopHomePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate      = useNavigate()
  const shopConfig    = useShopStore((s) => s.shopConfig)

  const { data: categoriesResult } = useQuery({
    queryKey : ['shop-categories', slug],
    queryFn  : () => getShopCategories(slug),
    staleTime: 5 * 60 * 1000,
    enabled  : !!slug,
  })

  const categories = categoriesResult?.data ?? []

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <HeroBanner
        title={shopConfig?.hero_title ?? null}
        subtitle={shopConfig?.hero_subtitle ?? null}
        bannerUrl={shopConfig?.hero_banner_url ?? null}
        onCatalogClick={() => navigate(`/shop/${slug}/catalog`)}
      />

      {/* ── Trust badges ──────────────────────────────────────────────────── */}
      <TrustBadges />

      {/* ── Nos rayons ────────────────────────────────────────────────────── */}
      <CategoryGrid categories={categories} slug={slug} />

      {/* ── Offres du moment (grille — peu de produits en promo) ────────── */}
      <HomeProductSection
        slug={slug}
        title="🔥 Offres du moment"
        sort="newest"
        onSale={true}
        variant="grid"
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
    </>
  )
}
