import {
  Bars3Icon,
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import apiClient from '@/lib/axios'
import { cn } from '@/lib/utils'
import NotificationBell from '@/components/ui/NotificationBell'
import {
  getTenantNotifications,
  markTenantNotificationRead,
  markAllTenantNotificationsRead,
  deleteTenantNotification,
} from '@/services/api/notifications'

interface TopbarProps {
  onMenuToggle: () => void
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post('/api/v1/auth/logout'),
    onSettled: () => {
      logout()
      window.location.href = '/login'
    },
  })

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6">
      {/* Hamburger mobile */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="lg:hidden -ml-1 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        aria-label="Ouvrir le menu"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      <div className="flex-1" />

      {/* Notifications */}
      <NotificationBell
        queryKey="tenant-notifications"
        fetchFn={getTenantNotifications}
        markReadFn={markTenantNotificationRead}
        markAllFn={markAllTenantNotificationsRead}
        deleteFn={deleteTenantNotification}
      />

      {/* Menu utilisateur — Headless UI Menu */}
      <Menu as="div" className="relative">
        <MenuButton className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
          {/* Avatar initiales */}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-semibold shrink-0">
            {initials}
          </span>
          <span className="hidden sm:block max-w-[140px] truncate">{user?.name}</span>
          <ChevronDownIcon className="h-4 w-4 text-gray-400 shrink-0" />
        </MenuButton>

        <MenuItems
          anchor="bottom end"
          className={cn(
            'z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg',
            'focus:outline-none',
            'transition data-[closed]:scale-95 data-[closed]:opacity-0',
            'data-[enter]:duration-100 data-[leave]:duration-75',
          )}
        >
          {/* En-tête utilisateur */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>

          <div className="p-1">
            {/* Mon profil */}
            <MenuItem>
              <Link
                to="/profile"
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors',
                  'data-[focus]:bg-gray-100',
                )}
              >
                <UserCircleIcon className="h-4 w-4 text-gray-400" />
                Mon profil
              </Link>
            </MenuItem>

            <div className="my-1 border-t border-gray-100" />

            {/* Déconnexion */}
            <MenuItem>
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 transition-colors',
                  'data-[focus]:bg-red-50',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                {logoutMutation.isPending ? 'Déconnexion...' : 'Se déconnecter'}
              </button>
            </MenuItem>
          </div>
        </MenuItems>
      </Menu>
    </header>
  )
}
