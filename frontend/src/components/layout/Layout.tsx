import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ToastContainer from '@/components/ui/ToastContainer'
import { useAuthStore } from '@/store/authStore'
import { useTenantStore } from '@/store/tenantStore'
import apiClient from '@/lib/axios'
import type { LoginResponse } from '@/types'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const tenant           = useAuthStore((s) => s.tenant)
  const setAuth          = useAuthStore((s) => s.setAuth)
  const token            = useAuthStore((s) => s.token)
  const user             = useAuthStore((s) => s.user)
  const applyBrandColors = useTenantStore((s) => s.applyBrandColors)

  // Applique les couleurs du cache immédiatement (pas de flash)
  useEffect(() => {
    if (tenant) {
      applyBrandColors(tenant.primary_color, tenant.secondary_color)
    }
  }, [tenant, applyBrandColors])

  // Rafraîchit silencieusement les données tenant depuis la DB à chaque montage
  // pour que les changements Super Admin (couleurs, nom, logo…) soient pris en compte
  // sans que le tenant ait besoin de se reconnecter.
  useEffect(() => {
    if (!token || !user) return
    // La réponse a la forme { data: { user, permissions, tenant } }
    apiClient.get<{ data: LoginResponse['data'] }>('/api/v1/auth/me').then(({ data: response }) => {
      const { user: freshUser, permissions: freshPerms, tenant: freshTenant } = response.data
      setAuth(token, freshUser, freshPerms, freshTenant)
      applyBrandColors(freshTenant.primary_color, freshTenant.secondary_color)
    }).catch(() => {
      // Silencieux — le cache localStorage reste valide si l'appel échoue
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Uniquement au montage

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Zone principale — décalée par la sidebar sur desktop */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
