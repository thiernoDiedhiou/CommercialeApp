import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useShopStore } from '@/shop/store/shopStore'
import { HeroBanner, PromoBlocks, TrustBadges, HomeProductSection } from '@/shop/components/home'
import { getShopCategories } from '@/shop/services/shop'
import { getCategoryIcon } from '@/shop/utils/categoryIcons'
import { Link } from 'react-router-dom'

const JAKARTA: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" }

// ── Strip de catégories pills (entre trust badges et sections produits) ────────
function CategoryPillStrip({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey : ['shop-categories', slug],
    queryFn  : () => getShopCategories(slug),
    staleTime: 5 * 60 * 1000,
    enabled  : !!slug,
  })
  const categories = data?.data ?? []
  if (categories.length === 0) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {/* "Tous" pill */}
        <Link
          to={`/shop/${slug}/catalog`}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors"
          style={{ ...JAKARTA, background: 'var(--shop-primary,#006948)' }}
        >
          Tous les produits
        </Link>

        {/* Catégories */}
        {categories.slice(0, 8).map((cat) => {
          const CatIcon = getCategoryIcon(cat.name)
          return (
            <Link
              key={cat.id}
              to={`/shop/${slug}/catalog?category=${cat.id}`}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
              style={JAKARTA}
            >
              <CatIcon className="h-4 w-4 shrink-0 text-slate-500" />
              {cat.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function ShopHomePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate      = useNavigate()
  const shopConfig    = useShopStore((s) => s.shopConfig)

  return (
    <>
      {/* 1. Hero */}
      <HeroBanner
        title={shopConfig?.hero_title ?? null}
        subtitle={shopConfig?.hero_subtitle ?? null}
        bannerUrl={shopConfig?.hero_banner_url ?? null}
        onCatalogClick={() => navigate(`/shop/${slug}/catalog`)}
      />

      {/* 2. Blocs promo configurables */}
      <PromoBlocks />

      {/* 3. Trust badges / réassurance */}
      <TrustBadges />

      {/* 4. Strip catégories pills */}
      <CategoryPillStrip slug={slug} />

      {/* 5. Offres du moment */}
      <HomeProductSection
        slug={slug}
        title="Offres du moment"
        label="PRIX EN BAISSE • QUANTITÉS LIMITÉES"
        icon="🔥"
        labelColor="red"
        sort="newest"
        onSale={true}
        variant="grid"
        seeAllTo={`/shop/${slug}/catalog?on_sale=1`}
      />

      {/* 6. Nouveaux arrivages */}
      <HomeProductSection
        slug={slug}
        title="Nouveaux arrivages"
        label="DÉBALLAGE DE LA SEMAINE"
        icon="✨"
        labelColor="slate"
        sort="newest"
        seeAllTo={`/shop/${slug}/catalog`}
      />

      {/* 7. Meilleures ventes */}
      <HomeProductSection
        slug={slug}
        title="Meilleures ventes"
        label="LES PLUS POPULAIRES"
        icon="⭐"
        labelColor="green"
        sort="best_sellers"
        seeAllTo={`/shop/${slug}/catalog`}
      />

      {/* Espace bas de page */}
      <div className="h-8 sm:h-12" />
    </>
  )
}
