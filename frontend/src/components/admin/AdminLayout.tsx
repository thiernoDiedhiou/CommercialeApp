import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  BuildingStorefrontIcon, ChartBarIcon, ArrowRightStartOnRectangleIcon,
  CreditCardIcon, BanknotesIcon, Bars3Icon, XMarkIcon,
} from '@heroicons/react/24/outline'
import { useSuperAdminStore } from '@/store/superAdminStore'
import { adminLogout } from '@/services/api/admin'
import ToastContainer from '@/components/ui/ToastContainer'

const NAV = [
  { label: 'Tableau de bord', path: '/admin/dashboard',    icon: ChartBarIcon },
  { label: 'Tenants',         path: '/admin/tenants',       icon: BuildingStorefrontIcon },
  { label: 'Plans',           path: '/admin/plans',         icon: CreditCardIcon },
  { label: 'Abonnements',     path: '/admin/subscriptions', icon: BanknotesIcon },
]

function ShieldIcon() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

export default function AdminLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const admin     = useSuperAdminStore((s) => s.admin)
  const logout    = useSuperAdminStore((s) => s.logout)
  const [open, setOpen] = useState(false)

  // Ferme le tiroir à chaque changement de route
  useEffect(() => { setOpen(false) }, [location.pathname])

  const logoutMutation = useMutation({
    mutationFn: adminLogout,
    onSettled: () => { logout(); navigate('/admin/login') },
  })

  // ── Contenu interne de la sidebar (réutilisé mobile + desktop) ────────────
  const SidebarContent = () => (
    <>
      {/* Header sidebar */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-800 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <ShieldIcon />
        </div>
        <span className="text-sm font-bold text-white truncate">Super Admin</span>
        {/* Bouton fermeture (mobile seulement) */}
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
          className="ml-auto lg:hidden rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
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

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800 shrink-0">
        <p className="text-xs font-medium text-gray-200 truncate">{admin?.name}</p>
        <p className="text-xs text-gray-500 truncate">{admin?.email}</p>
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="mt-3 flex items-center gap-2 text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-950">

      {/* ── Mobile : barre de navigation en haut ──────────────────────────── */}
      <header className="lg:hidden h-14 flex items-center gap-3 px-4 bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
        <button
          type="button"
          aria-label="Ouvrir le menu"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <ShieldIcon />
          </div>
          <span className="text-sm font-bold text-white">Super Admin</span>
        </div>
      </header>

      <div className="flex">
        {/* ── Desktop : sidebar fixe ─────────────────────────────────────── */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-gray-900 border-r border-gray-800 min-h-screen sticky top-0 h-screen">
          <SidebarContent />
        </aside>

        {/* ── Mobile : tiroir overlay ────────────────────────────────────── */}
        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <aside className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-gray-900 border-r border-gray-800 lg:hidden shadow-2xl">
              <SidebarContent />
            </aside>
          </>
        )}

        {/* ── Contenu principal ──────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
