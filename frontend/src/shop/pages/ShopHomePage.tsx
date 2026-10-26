import { useNavigate, useParams } from 'react-router-dom'
import { useShopStore } from '@/shop/store/shopStore'
import { HeroBanner, TrustBadges, HomeProductSection } from '@/shop/components/home'

export default function ShopHomePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate      = useNavigate()
  const shopConfig    = useShopStore((s) => s.shopConfig)

  return (
    <>
      <HeroBanner
        title={shopConfig?.hero_title ?? null}
        subtitle={shopConfig?.hero_subtitle ?? null}
        bannerUrl={shopConfig?.hero_banner_url ?? null}
        onCatalogClick={() => navigate(`/shop/${slug}/catalog`)}
      />

      <TrustBadges />

      <HomeProductSection
        slug={slug}
        title="🔥 Offres du moment"
        sort="newest"
        onSale={true}
        variant="grid"
        seeAllTo={`/shop/${slug}/catalog?on_sale=1`}
      />

      <HomeProductSection
        slug={slug}
        title="Nouveaux arrivages"
        sort="newest"
        seeAllTo={`/shop/${slug}/catalog`}
      />

      <HomeProductSection
        slug={slug}
        title="Meilleures ventes"
        sort="best_sellers"
        seeAllTo={`/shop/${slug}/catalog`}
      />
    </>
  )
}
