import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ToastContainer from '@/components/ui/ToastContainer'
import { useAuthStore } from '@/store/authStore'
import { useTenantStore } from '@/store/tenantStore'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const tenant           = useAuthStore((s) => s.tenant)
  const applyBrandColors = useTenantStore((s) => s.applyBrandColors)

  // Applique les couleurs tenant au montage (et à chaque changement de tenant)
  useEffect(() => {
    if (tenant) {
      applyBrandColors(tenant.primary_color, tenant.secondary_color)
    }
  }, [tenant, applyBrandColors])

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
