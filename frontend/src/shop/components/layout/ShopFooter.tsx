import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useShopStore } from '@/shop/store/shopStore'
import { getShopCategories } from '@/shop/services/shop'

interface Props {
  slug: string
}

export default function ShopFooter({ slug }: Props) {
  const shopConfig = useShopStore((s) => s.shopConfig)

  const { data: categoriesResult } = useQuery({
    queryKey: ['shop-categories', slug],
    queryFn : () => getShopCategories(slug),
    staleTime: 5 * 60 * 1000,
    enabled  : !!slug,
  })
  const categories = categoriesResult?.data

  const whatsappNumber = shopConfig?.whatsapp_number
    ? shopConfig.whatsapp_number.replace(/[^0-9]/g, '')
    : null

  const year = new Date().getFullYear()
  const appName = import.meta.env.VITE_APP_NAME ?? 'SaaS Commercial'

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">

          {/* ── Colonne 1 — Identité ──────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Logo ou Nom */}
            <Link to={`/shop/${slug}`} className="inline-block">
              {shopConfig?.logo_url ? (
                <img
                  src={shopConfig.logo_url}
                  alt={shopConfig.name}
                  className="max-h-10 object-contain brightness-0 invert"
                />
              ) : (
                <span className="text-lg font-bold text-white">
                  {shopConfig?.name ?? ''}
                </span>
              )}
            </Link>

            {/* Description */}
            {shopConfig?.description && (
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                {shopConfig.description}
              </p>
            )}

            {/* Réseaux sociaux */}
            {(shopConfig?.facebook_url || shopConfig?.instagram_url || shopConfig?.twitter_url) && (
              <div className="flex gap-3 mt-1">
                {shopConfig.facebook_url && (
                  <a
                    href={shopConfig.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
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
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
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
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Colonne 2 — Contact ───────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Contact
            </h3>

            {shopConfig?.address && (
              <div className="flex items-start gap-2 text-sm text-gray-400">
                <svg className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="leading-relaxed">{shopConfig.address}</span>
              </div>
            )}

            {shopConfig?.opening_hours && (
              <div className="flex items-start gap-2 text-sm text-gray-400">
                <svg className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="leading-relaxed whitespace-pre-line">{shopConfig.opening_hours}</span>
              </div>
            )}

            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {shopConfig?.whatsapp_number}
              </a>
            )}
          </div>

          {/* ── Colonne 3 — Navigation ────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Navigation
            </h3>

            <nav className="flex flex-col gap-2">
              <Link
                to={`/shop/${slug}`}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Accueil
              </Link>
              <Link
                to={`/shop/${slug}/catalog`}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Catalogue
              </Link>

              {/* Catégories (max 5) */}
              {categories?.slice(0, 5).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop/${slug}/catalog?category=${cat.id}`}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* ── Bas de page ───────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>
            {shopConfig?.footer_text
              ? shopConfig.footer_text
              : `© ${year} ${shopConfig?.name ?? ''}`}
          </span>
          <span>
            Propulsé par{' '}
            <span className="text-gray-400 font-medium">{appName}</span>
          </span>
        </div>
      </div>
    </footer>
  )
}
