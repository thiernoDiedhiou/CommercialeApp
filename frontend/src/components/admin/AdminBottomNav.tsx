import { NavLink, useLocation } from 'react-router-dom'
import {
  ChartBarIcon,
  BuildingStorefrontIcon,
  CreditCardIcon,
  BanknotesIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Accueil',      path: '/admin/dashboard',    icon: ChartBarIcon },
  { label: 'Tenants',      path: '/admin/tenants',       icon: BuildingStorefrontIcon },
  { label: 'Plans',        path: '/admin/plans',         icon: CreditCardIcon },
  { label: 'Abonnements',  path: '/admin/subscriptions', icon: BanknotesIcon },
  { label: 'Paramètres',   path: '/admin/site-settings', icon: Cog6ToothIcon },
]

export default function AdminBottomNav() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-gray-900 border-t border-gray-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14 items-stretch">
        {NAV.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path))
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5',
                'text-[10px] font-medium leading-tight transition-colors',
                isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300',
              )}
            >
              <item.icon
                className={cn('h-5 w-5 shrink-0', isActive && 'stroke-[2.5px]')}
              />
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
