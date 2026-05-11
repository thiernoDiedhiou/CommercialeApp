import { NavLink } from 'react-router-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { useHomePath } from '@/hooks/useHomePath'
import { NAV_ITEMS } from '@/lib/navItems'
import { cn } from '@/lib/utils'

interface SidebarContentProps {
  onClose: () => void
}

function SidebarContent({ onClose }: SidebarContentProps) {
  const permissions  = useAuthStore((s) => s.permissions)
  const tenant       = useAuthStore((s) => s.tenant)
  const visibleItems = NAV_ITEMS.filter((item) => permissions.includes(item.permission))
  const homePath     = useHomePath()

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* En-tête tenant */}
      <NavLink
        to={homePath}
        className="flex h-16 shrink-0 items-center gap-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
        onClick={onClose}
      >
        {tenant?.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant.name}
            className="h-9 w-9 shrink-0 rounded-lg object-contain"
          />
        ) : null}
        <span className="truncate text-lg font-bold text-brand-primary">
          {tenant?.name ?? 'Gestion Commerciale'}
        </span>
      </NavLink>

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
