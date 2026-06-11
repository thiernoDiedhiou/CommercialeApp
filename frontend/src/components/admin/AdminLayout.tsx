import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import {
  BuildingStorefrontIcon, ChartBarIcon, ArrowRightStartOnRectangleIcon,
  CreditCardIcon, BanknotesIcon, Bars3Icon, XMarkIcon, Cog6ToothIcon,
  ChevronDownIcon, UserCircleIcon,
} from '@heroicons/react/24/outline'
import { useSuperAdminStore } from '@/store/superAdminStore'
import { adminLogout } from '@/services/api/admin'
import ToastContainer from '@/components/ui/ToastContainer'
import NotificationBell from '@/components/ui/NotificationBell'
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  deleteAdminNotification,
} from '@/services/api/notifications'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Tableau de bord', path: '/admin/dashboard',    icon: ChartBarIcon },
  { label: 'Tenants',         path: '/admin/tenants',       icon: BuildingStorefrontIcon },
  { label: 'Plans',           path: '/admin/plans',         icon: CreditCardIcon },
  { label: 'Abonnements',     path: '/admin/subscriptions', icon: BanknotesIcon },
  { label: 'Paramètres site', path: '/admin/site-settings', icon: Cog6ToothIcon },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const admin    = useSuperAdminStore((s) => s.admin)
  const logout   = useSuperAdminStore((s) => s.logout)
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [location.pathname])

  const logoutMutation = useMutation({
    mutationFn: adminLogout,
    onSettled: () => { logout(); navigate('/admin/login') },
  })

  // ── Contenu sidebar (réutilisé mobile + desktop) ───────────────────────────
  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-gray-800 shrink-0">
        <img src="/logo_blanc.svg" alt="DiDi Sphere" className="h-8 w-auto" />
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
          className="ml-auto lg:hidden rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-950 flex">

      {/* ── Desktop : sidebar fixe ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-gray-900 border-r border-gray-800 min-h-screen sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* ── Mobile : tiroir overlay ────────────────────────────────────────── */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-gray-900 border-r border-gray-800 lg:hidden shadow-2xl">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Zone principale (topbar + contenu) ───────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 flex items-center gap-4 px-4 lg:px-6 bg-gray-900 border-b border-gray-800">
          {/* Hamburger mobile */}
          <button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setOpen(true)}
            className="lg:hidden rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          {/* Logo mobile */}
          <img
            src="/logo_blanc.svg"
            alt="DiDi Sphere"
            className="h-7 w-auto lg:hidden"
          />

          <div className="flex-1" />

          {/* Cloche notifications */}
          <NotificationBell
            queryKey="admin-notifications"
            fetchFn={getAdminNotifications}
            markReadFn={markAdminNotificationRead}
            markAllFn={markAllAdminNotificationsRead}
            deleteFn={deleteAdminNotification}
            dark
          />

          {/* Profil Super Admin */}
          <Menu as="div" className="relative">
            <MenuButton className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <UserCircleIcon className="h-6 w-6 shrink-0 text-gray-400" />
              <span className="hidden sm:block leading-tight text-left">
                <span className="block text-sm font-medium text-gray-200">{admin?.name}</span>
                <span className="block text-xs text-gray-500">{admin?.email}</span>
              </span>
              <ChevronDownIcon className="h-4 w-4 text-gray-500 shrink-0" />
            </MenuButton>

            <MenuItems
              anchor="bottom end"
              className={cn(
                'z-50 mt-1 w-52 rounded-xl border border-gray-700 bg-gray-900 p-1 shadow-2xl',
                'focus:outline-none',
                'transition data-[closed]:scale-95 data-[closed]:opacity-0',
                'data-[enter]:duration-100 data-[leave]:duration-75',
              )}
            >
              {/* Info utilisateur */}
              <div className="px-3 py-2 border-b border-gray-800 mb-1">
                <p className="text-xs font-semibold text-gray-200 truncate">{admin?.name}</p>
                <p className="text-xs text-gray-500 truncate">{admin?.email}</p>
              </div>

              <MenuItem>
                <button
                  type="button"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors',
                    'data-[focus]:bg-gray-800',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                >
                  <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                  {logoutMutation.isPending ? 'Déconnexion…' : 'Se déconnecter'}
                </button>
              </MenuItem>
            </MenuItems>
          </Menu>
        </header>

        {/* Contenu de la page */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
