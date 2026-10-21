import {
  Bars3Icon,
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  UserCircleIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import apiClient from '@/lib/axios'
import { cn } from '@/lib/utils'
import NotificationBell from '@/components/ui/NotificationBell'
import GlobalSearch from '@/components/ui/GlobalSearch'
import {
  getTenantNotifications,
  markTenantNotificationRead,
  markAllTenantNotificationsRead,
  deleteTenantNotification,
} from '@/services/api/notifications'
import { useHomePath } from '@/hooks/useHomePath'

interface TopbarProps {
  onMenuToggle: () => void
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { t } = useTranslation()
  const user         = useAuthStore((s) => s.user)
  const tenant       = useAuthStore((s) => s.tenant)
  const logout       = useAuthStore((s) => s.logout)
  const homePath     = useHomePath()
  const theme        = useThemeStore((s) => s.theme)
  const toggleTheme  = useThemeStore((s) => s.toggleTheme)

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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 px-4 shadow-sm lg:px-6 transition-colors duration-200">
      {/* Hamburger — tablette md-lg (la BottomNav couvre les phones) */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="hidden md:flex lg:hidden -ml-1 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        aria-label={t('common.open_menu')}
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {/* Logo / nom du tenant — visible uniquement sur mobile (sidebar cachée) */}
      <Link
        to={homePath}
        className="flex lg:hidden flex-1 items-center gap-2 min-w-0"
      >
        {tenant?.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant.name}
            className="h-11 w-11 shrink-0 rounded-md object-contain"
          />
        ) : null}
        <span className="truncate text-base font-extrabold text-brand-primary">
          {tenant?.name ?? 'Gestion Commerciale'}
        </span>
      </Link>

      {/* Barre de recherche globale — desktop uniquement */}
      <div className="hidden lg:flex flex-1 items-center">
        <GlobalSearch />
      </div>

      {/* Notifications */}
      <NotificationBell
        queryKey="tenant-notifications"
        fetchFn={getTenantNotifications}
        markReadFn={markTenantNotificationRead}
        markAllFn={markAllTenantNotificationsRead}
        deleteFn={deleteTenantNotification}
      />

      {/* Bascule thème clair / sombre */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? t('common.light_mode') : t('common.dark_mode')}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 transition-colors"
      >
        {theme === 'dark' ? (
          <SunIcon className="h-5 w-5" />
        ) : (
          <MoonIcon className="h-5 w-5" />
        )}
      </button>

      {/* Menu utilisateur — Headless UI Menu */}
      <Menu as="div" className="relative">
        <MenuButton className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
          {/* Avatar : photo ou initiales */}
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-gray-200"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-semibold shrink-0">
              {initials}
            </span>
          )}
          <ChevronDownIcon className="h-4 w-4 text-gray-400 shrink-0" />
        </MenuButton>

        <MenuItems
          anchor="bottom end"
          className={cn(
            'z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-lg',
            'focus:outline-none',
            'transition data-[closed]:scale-95 data-[closed]:opacity-0',
            'data-[enter]:duration-100 data-[leave]:duration-75',
          )}
        >
          {/* En-tête utilisateur */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>

          <div className="p-1">
            {/* Mon profil */}
            <MenuItem>
              <Link
                to="/profile"
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-300 transition-colors',
                  'data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700',
                )}
              >
                <UserCircleIcon className="h-4 w-4 text-gray-400" />
                {t('auth.profile')}
              </Link>
            </MenuItem>

            <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

            {/* Déconnexion */}
            <MenuItem>
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 transition-colors',
                  'data-[focus]:bg-red-50 dark:data-[focus]:bg-red-900/20',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                {logoutMutation.isPending ? t('auth.logging_out') : t('auth.logout')}
              </button>
            </MenuItem>
          </div>
        </MenuItems>
      </Menu>
    </header>
  )
}
