import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getShopConfig } from '@/shop/services/shop'
import { useShopStore } from '@/shop/store/shopStore'
import { WhatsAppFAB } from '@/shop/components/shared'
import { AnnouncementBar } from '@/shop/components/home'
import { CartDrawer } from '@/shop/components/cart'
import ShopNavbar from './ShopNavbar'
import ShopFooter from './ShopFooter'

export default function ShopLayout() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { setConfig, shopConfig } = useShopStore()

  const { data, isLoading } = useQuery({
    queryKey: ['shop-config', slug],
    queryFn : () => getShopConfig(slug),
    staleTime: 5 * 60 * 1000,
    enabled  : !!slug,
  })

  // Applique la config au store + meta tags dès réception
  useEffect(() => {
    if (!data) return

    setConfig(data.shop, data.theme)

    // <title>
    document.title = data.seo.meta_title || data.shop.name

    // <meta name="description">
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.name = 'description'
      document.head.appendChild(metaDesc)
    }
    metaDesc.content = data.seo.meta_description ?? ''

    // <meta name="theme-color"> (barre navigateur mobile)
    let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!themeColor) {
      themeColor = document.createElement('meta')
      themeColor.name = 'theme-color'
      document.head.appendChild(themeColor)
    }
    themeColor.content = data.theme.primary_color

    // <link rel="icon"> — favicon prioritaire, sinon logo comme fallback
    const faviconUrl = data.shop.favicon_url ?? data.shop.logo_url
    if (faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = faviconUrl
    }
  }, [data, setConfig])

  // Écran de chargement pendant la résolution de la config
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-gray-500 animate-spin" />
          <p className="text-sm text-gray-400">Chargement de la boutique…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {shopConfig?.announcement_bar_active && shopConfig.announcement_bar && (
        <AnnouncementBar text={shopConfig.announcement_bar} />
      )}

      <ShopNavbar slug={slug} />

      <main><Outlet /></main>

      <ShopFooter slug={slug} />

      <WhatsAppFAB number={shopConfig?.whatsapp_number ?? null} />
      <CartDrawer />
    </div>
  )
}
