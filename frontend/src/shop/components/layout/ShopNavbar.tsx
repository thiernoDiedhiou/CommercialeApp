import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useShopStore } from '@/shop/store/shopStore'

interface Props {
  slug: string
}

export default function ShopNavbar({ slug }: Props) {
  const navigate        = useNavigate()
  const [scrolled, setScrolled]           = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen]       = useState(false)
  const [searchValue, setSearchValue]     = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const shopConfig = useShopStore((s) => s.shopConfig)
  const items      = useShopStore((s) => s.items)
  const toggleCart = useShopStore((s) => s.toggleCart)
  const itemCount  = items.reduce((sum, item) => sum + item.quantity, 0)

  // Ombre au scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Autofocus barre de recherche mobile
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  // Bloquer le scroll quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const handleSearch = (value: string) => {
    setSearchValue(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        navigate(`/shop/${slug}/catalog?search=${encodeURIComponent(value.trim())}`)
      }
    }, 300)
  }

  const whatsappNumber = shopConfig?.whatsapp_number
    ? shopConfig.whatsapp_number.replace(/[^0-9]/g, '')
    : null

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-shadow ${
          scrolled ? 'shadow-sm' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">

            {/* ── Logo ─────────────────────────────────────────────────── */}
            <Link to={`/shop/${slug}`} className="flex-shrink-0">
              {shopConfig?.logo_url ? (
                <img
                  src={shopConfig.logo_url}
                  alt={shopConfig.name}
                  className="max-h-10 object-contain"
                />
              ) : (
                <span className="text-lg font-semibold text-gray-900 truncate max-w-[140px]">
                  {shopConfig?.name ?? ''}
                </span>
              )}
            </Link>

            {/* ── SearchBar desktop (centre) ────────────────────────────── */}
            <div className="hidden sm:flex flex-1 justify-center">
              <div className="relative w-full max-w-sm">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Rechercher un produit…"
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full outline-none transition-colors focus:border-[var(--shop-primary,#111827)] focus:bg-white"
                />
              </div>
            </div>

            {/* ── Icons droite ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2 ml-auto sm:ml-0">

              {/* Recherche mobile */}
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Rechercher"
                className="sm:hidden p-2 rounded-full text-gray-600 hover:bg-gray-100"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>

              {/* WhatsApp (si configuré) */}
              {whatsappNumber && (
                <button
                  type="button"
                  onClick={() => window.open(`https://wa.me/${whatsappNumber}`, '_blank')}
                  aria-label="WhatsApp"
                  className="hidden sm:flex p-2 rounded-full hover:bg-gray-100"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#25D366" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </button>
              )}

              {/* Panier */}
              <button
                type="button"
                onClick={toggleCart}
                aria-label={`Panier — ${itemCount} article${itemCount > 1 ? 's' : ''}`}
                className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100"
              >
                <ShoppingCartIcon className="h-6 w-6" />
                {itemCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: 'var(--shop-primary, #111827)' }}
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </button>

              {/* Burger mobile */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Menu"
                className="sm:hidden p-2 rounded-full text-gray-600 hover:bg-gray-100"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Barre recherche mobile ──────────────────────────────────── */}
        {searchOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 flex items-center gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Rechercher un produit…"
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => { setSearchOpen(false); setSearchValue('') }}
              className="text-sm text-gray-500 font-medium shrink-0"
            >
              Annuler
            </button>
          </div>
        )}
      </header>

      {/* ── Menu mobile slide-over ──────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex sm:hidden">
          {/* Overlay */}
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Panneau */}
          <div className="w-full max-w-xs bg-white h-full flex flex-col shadow-xl">
            {/* Header panneau */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-semibold text-gray-900">
                {shopConfig?.name ?? 'Menu'}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fermer le menu"
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-5 py-6 space-y-1">
              {[
                { label: 'Accueil',   to: `/shop/${slug}` },
                { label: 'Catalogue', to: `/shop/${slug}/catalog` },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Réseaux sociaux */}
            {(shopConfig?.facebook_url || shopConfig?.instagram_url || shopConfig?.twitter_url) && (
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                {shopConfig.facebook_url && (
                  <a
                    href={shopConfig.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                )}
                {shopConfig.instagram_url && (
                  <a
                    href={shopConfig.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162S8.597 18.163 12 18.163s6.162-2.759 6.162-6.162S15.403 5.838 12 5.838zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}
                {shopConfig.twitter_url && (
                  <a
                    href={shopConfig.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter / X"
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
