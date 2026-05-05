import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  XMarkIcon,
  TruckIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  permission: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', path: '/dashboard',  icon: HomeIcon,                  permission: 'dashboard.view' },
  { label: 'Caisse POS',      path: '/pos',         icon: ShoppingCartIcon,          permission: 'pos.access' },
  { label: 'Ventes',          path: '/sales',        icon: CurrencyDollarIcon,        permission: 'sales.view' },
  { label: 'Factures',        path: '/invoices',     icon: DocumentTextIcon,          permission: 'invoices.view' },
  { label: 'Produits',        path: '/products',     icon: ArchiveBoxIcon,            permission: 'products.view' },
  { label: 'Fournisseurs',    path: '/suppliers',    icon: TruckIcon,                 permission: 'suppliers.view' },
  { label: 'Achats',          path: '/purchases',    icon: ShoppingBagIcon,           permission: 'purchases.view' },
  { label: 'Clients',         path: '/customers',    icon: UsersIcon,                 permission: 'customers.view' },
  { label: 'Stock',           path: '/stock',        icon: ClipboardDocumentListIcon, permission: 'stock.view' },
  { label: 'Rapports',        path: '/reports',      icon: ChartBarIcon,              permission: 'reports.view' },
  { label: 'Paramètres',      path: '/settings',     icon: Cog6ToothIcon,             permission: 'users.view' },
]

interface SidebarContentProps {
  onClose: () => void
}

function SidebarContent({ onClose }: SidebarContentProps) {
  const permissions  = useAuthStore((s) => s.permissions)
  const tenant       = useAuthStore((s) => s.tenant)
  const visibleItems = NAV_ITEMS.filter((item) => permissions.includes(item.permission))

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* En-tête tenant */}
      <div className="flex h-16 shrink-0 items-center px-4 border-b border-gray-200">
        <span className="truncate text-lg font-bold text-brand-primary">
          {tenant?.name ?? 'Gestion Commerciale'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop : sidebar fixe toujours visible */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:z-10">
        <SidebarContent onClose={() => {}} />
      </div>

      {/* Mobile : slide-over avec backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-gray-900/60"
          onClick={onClose}
        />

        {/* Panneau */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex w-64 flex-col',
            'transition-transform duration-200 ease-in-out',
            isOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {/* Bouton fermer */}
          <div className="absolute right-[-44px] top-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow text-gray-600"
              aria-label="Fermer le menu"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <SidebarContent onClose={onClose} />
        </div>
      </div>
    </>
  )
}
