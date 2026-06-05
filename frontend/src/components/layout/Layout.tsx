import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ToastContainer from '@/components/ui/ToastContainer'
import SubscriptionBanner from '@/components/ui/SubscriptionBanner'
import { useAuthStore } from '@/store/authStore'
import { useTenantStore } from '@/store/tenantStore'
import apiClient from '@/lib/axios'
import type { LoginResponse } from '@/types'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const tenant           = useAuthStore((s) => s.tenant)
  const subscription     = useAuthStore((s) => s.subscription)
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

  // Au montage : rafraîchit les données depuis /auth/me qui retourne l'api_key.
  // Couvre aussi la restauration après F5 (tenantApiKey non persisté).
  useEffect(() => {
    if (!token || !user) return

    apiClient.get<{ data: LoginResponse['data'] }>('/api/v1/auth/me').then(({ data: response }) => {
      const currentToken = useAuthStore.getState().token
      if (!currentToken) return
      const { user: freshUser, permissions: freshPerms, tenant: freshTenant, subscription: freshSub, plan_features } = response.data
      setAuth(currentToken, freshUser, freshPerms, freshTenant, freshSub, plan_features)
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

        {/* Bannière d'alerte abonnement — visible si expiration dans ≤ 7 jours */}
        <SubscriptionBanner subscription={subscription} />

        <main className="flex-1 px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
