import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { getShopConfig } from '@/shop/services/shop'
import { useShopStore } from '@/shop/store/shopStore'
import { WhatsAppFAB, ScrollToTopButton } from '@/shop/components/shared'
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

  // Empêche le scroll horizontal sur toutes les pages du shop
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.overflowX
    html.style.overflowX = 'hidden'
    return () => { html.style.overflowX = prev }
  }, [])

  // Applique la config au store dès réception
  useEffect(() => {
    if (!data) return
    setConfig(data.shop, data.theme)
  }, [data, setConfig])

  // Google Analytics tenant — injecté uniquement si l'ID est configuré
  useEffect(() => {
    const gaId = data?.seo.google_analytics_id
    if (!gaId) return

    if (document.getElementById('ga-script')) return

    const script1 = document.createElement('script')
    script1.id    = 'ga-script'
    script1.async = true
    script1.src   = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
    document.head.appendChild(script1)

    const script2 = document.createElement('script')
    script2.id   = 'ga-init'
    script2.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`
    document.head.appendChild(script2)

    return () => {
      document.getElementById('ga-script')?.remove()
      document.getElementById('ga-init')?.remove()
    }
  }, [data?.seo.google_analytics_id])

  // Favicon du tenant — Helmet ne peut pas supprimer les <link rel="icon"> statiques
  // de index.html (SVG DiDi Sphere priorisé par le navigateur). Manipulation DOM requise.
  useEffect(() => {
    const url = data?.shop.favicon_url ?? data?.shop.logo_url
    if (!url) return
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
      .forEach(el => el.remove())
    const link = document.createElement('link')
    link.rel  = 'icon'
    link.href = url
    document.head.appendChild(link)
  }, [data?.shop.favicon_url, data?.shop.logo_url])

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

  const shopTitle = data?.seo.meta_title || data?.shop.name || 'Boutique'
  const shopDesc  = data?.seo.meta_description ?? ''
  const faviconUrl = data?.shop.favicon_url ?? data?.shop.logo_url ?? undefined
  const themeColor = data?.theme.primary_color ?? '#111827'

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Helmet>
        <title>{shopTitle}</title>
        {shopDesc && <meta name="description" content={shopDesc} />}
        <meta name="theme-color" content={themeColor} />
        <link rel="canonical" href={`${window.location.origin}/shop/${slug}`} />
        <meta property="og:title"       content={shopTitle} />
        {shopDesc && <meta property="og:description" content={shopDesc} />}
        <meta property="og:type"        content="website" />
        <meta property="og:locale"      content="fr_SN" />
        <meta property="og:url"         content={`${window.location.origin}/shop/${slug}`} />
        {faviconUrl && <meta property="og:image"            content={faviconUrl} />}
        {faviconUrl && <meta property="og:image:secure_url" content={faviconUrl} />}
        {faviconUrl && <meta property="og:image:alt"        content={shopTitle} />}
      </Helmet>

      {shopConfig?.announcement_bar_active && shopConfig.announcement_bar && (
        <AnnouncementBar
          text={shopConfig.announcement_bar}
          phone={shopConfig.whatsapp_number}
          marquee={(shopConfig.announcement_bar?.length ?? 0) > 60}
        />
      )}

      <ShopNavbar slug={slug} />

      <main><Outlet /></main>

      <ShopFooter slug={slug} />

      <WhatsAppFAB number={shopConfig?.whatsapp_number ?? null} />
      <ScrollToTopButton />
      <CartDrawer />
    </div>
  )
}
