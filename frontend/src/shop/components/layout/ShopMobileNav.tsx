import { Link, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  Squares2X2Icon,
  ShoppingCartIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  ShoppingCartIcon as ShoppingCartIconSolid,
} from '@heroicons/react/24/solid'
import { useShopStore } from '@/shop/store/shopStore'

interface Props {
  slug      : string
  onMenuOpen: () => void
}

export default function ShopMobileNav({ slug, onMenuOpen }: Props) {
  const location   = useLocation()
  const items      = useShopStore((s) => s.items)
  const toggleCart = useShopStore((s) => s.toggleCart)

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const isHome    = location.pathname === `/shop/${slug}` || location.pathname === `/shop/${slug}/`
  const isCatalog = location.pathname.startsWith(`/shop/${slug}/catalog`) || location.pathname.startsWith(`/shop/${slug}/products`)

  const tabClass = (active: boolean) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
      active ? 'text-[var(--shop-primary,#111827)]' : 'text-gray-500'
    }`

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch h-14">

        {/* Accueil */}
        <Link to={`/shop/${slug}`} className={tabClass(isHome)}>
          {isHome
            ? <HomeIconSolid className="h-6 w-6" />
            : <HomeIcon className="h-6 w-6" />}
          <span>Accueil</span>
        </Link>

        {/* Catégories */}
        <Link to={`/shop/${slug}/catalog`} className={tabClass(isCatalog)}>
          {isCatalog
            ? <Squares2X2IconSolid className="h-6 w-6" />
            : <Squares2X2Icon className="h-6 w-6" />}
          <span>Catégories</span>
        </Link>

        {/* Panier */}
        <button
          type="button"
          onClick={toggleCart}
          aria-label={`Panier — ${itemCount} article${itemCount !== 1 ? 's' : ''}`}
          className={tabClass(false)}
        >
          <span className="relative">
            {itemCount > 0
              ? <ShoppingCartIconSolid className="h-6 w-6 text-[var(--shop-primary,#111827)]" />
              : <ShoppingCartIcon className="h-6 w-6" />}
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white bg-[var(--shop-primary,#111827)]">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </span>
          <span>Panier</span>
        </button>

        {/* Menu */}
        <button
          type="button"
          onClick={onMenuOpen}
          aria-label="Ouvrir le menu"
          className={tabClass(false)}
        >
          <Bars3Icon className="h-6 w-6" />
          <span>Menu</span>
        </button>

      </div>
    </nav>
  )
}
