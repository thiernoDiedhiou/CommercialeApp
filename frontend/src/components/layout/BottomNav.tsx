import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Menu,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  onMenuOpen: () => void
}

export default function BottomNav({ onMenuOpen }: BottomNavProps) {
  const { t }       = useTranslation()
  const permissions = useAuthStore((s) => s.permissions)
  const location    = useLocation()

  const QUICK_ITEMS = [
    { labelKey: 'nav.home',      path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { labelKey: 'nav.caisse',    path: '/pos',        icon: ShoppingCart,    permission: 'pos.access'     },
    { labelKey: 'nav.sales',     path: '/sales',      icon: Receipt,         permission: 'sales.view'     },
    { labelKey: 'nav.products',  path: '/products',   icon: Package,         permission: 'products.view'  },
    { labelKey: 'nav.customers', path: '/customers',  icon: Users,           permission: 'customers.view' },
  ]

  // Prend les 4 premiers items pour lesquels l'utilisateur a la permission
  const visible = QUICK_ITEMS.filter((item) => permissions.includes(item.permission)).slice(0, 4)

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14 items-stretch">
        {visible.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5',
                'text-[10px] font-medium leading-tight transition-colors',
                isActive ? 'text-brand-primary' : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'stroke-[2.5px]')} />
              {t(item.labelKey)}
            </NavLink>
          )
        })}

        {/* Bouton Menu — toujours présent, ouvre le slide-over */}
        <button
          type="button"
          onClick={onMenuOpen}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium leading-tight text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Menu className="h-5 w-5 shrink-0" />
          {t('nav.menu')}
        </button>
      </div>
    </nav>
  )
}
