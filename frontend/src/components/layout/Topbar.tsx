import {
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import apiClient from '@/lib/axios'
import { cn } from '@/lib/utils'

interface TopbarProps {
  onMenuToggle: () => void
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post('/api/v1/auth/logout'),
    onSettled: () => {
      // onSettled garantit le nettoyage même si le serveur est injoignable
      logout()
      window.location.href = '/login'
    },
  })

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

      {/* Menu utilisateur — Headless UI Menu */}
      <Menu as="div" className="relative">
        <MenuButton className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
          <span className="hidden sm:block">{user?.name}</span>
          <ChevronDownIcon className="h-4 w-4 text-gray-500" />
        </MenuButton>

        <MenuItems
          anchor="bottom end"
          className={cn(
            'z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg',
            'focus:outline-none',
            // Transitions HUI v2 via data attributes
            'transition data-[closed]:scale-95 data-[closed]:opacity-0',
            'data-[enter]:duration-100 data-[leave]:duration-75',
          )}
        >
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
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              {logoutMutation.isPending ? 'Déconnexion...' : 'Se déconnecter'}
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
    </header>
  )
}
