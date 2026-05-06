import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { BuildingStorefrontIcon, ChartBarIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useSuperAdminStore } from '@/store/superAdminStore'
import { adminLogout } from '@/services/api/admin'
import ToastContainer from '@/components/ui/ToastContainer'

const NAV = [
  { label: 'Tableau de bord', path: '/admin/dashboard', icon: ChartBarIcon },
  { label: 'Tenants',         path: '/admin/tenants',   icon: BuildingStorefrontIcon },
]

export default function AdminLayout() {
  const navigate  = useNavigate()
  const admin     = useSuperAdminStore((s) => s.admin)
  const logout    = useSuperAdminStore((s) => s.logout)

  const logoutMutation = useMutation({
    mutationFn: adminLogout,
    onSettled: () => { logout(); navigate('/admin/login') },
  })

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
        {/* Header */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-800">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white truncate">Super Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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

        {/* Footer admin info */}
        <div className="px-4 py-4 border-t border-gray-800">
          <p className="text-xs font-medium text-gray-200 truncate">{admin?.name}</p>
          <p className="text-xs text-gray-500 truncate">{admin?.email}</p>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="mt-3 flex items-center gap-2 text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Contenu */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  )
}
