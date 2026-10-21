import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'
import ToastContainer from '@/components/ui/ToastContainer'
import SubscriptionBanner from '@/components/ui/SubscriptionBanner'
import { useAuthStore } from '@/store/authStore'
import { useTenantStore } from '@/store/tenantStore'
import { useThemeStore } from '@/store/themeStore'
import apiClient from '@/lib/axios'
import type { LoginResponse } from '@/types'

export default function Layout() {
  const { i18n } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const swipeStartX = useRef<number | null>(null)
  const tenant           = useAuthStore((s) => s.tenant)
  const subscription     = useAuthStore((s) => s.subscription)
  const setAuth          = useAuthStore((s) => s.setAuth)
  const token            = useAuthStore((s) => s.token)
  const user             = useAuthStore((s) => s.user)
  const applyBrandColors = useTenantStore((s) => s.applyBrandColors)
  const applyTheme       = useThemeStore((s) => s.applyTheme)

  // Swipe depuis le bord gauche (≤ 24px) pour ouvrir la sidebar sur mobile
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const x = e.touches[0].clientX
      swipeStartX.current = x <= 24 ? x : null
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (swipeStartX.current === null) return
      const dx = e.changedTouches[0].clientX - swipeStartX.current
      if (dx > 60) setSidebarOpen(true)
      swipeStartX.current = null
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // Applique le thème (dark/light) dès le montage pour éviter le flash
  useEffect(() => {
    applyTheme()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Applique les couleurs du cache immédiatement (pas de flash)
  useEffect(() => {
    if (tenant) {
      applyBrandColors(tenant.primary_color, tenant.secondary_color)
    }
  }, [tenant, applyBrandColors])

  // La préférence utilisateur prime sur le locale du tenant
  const effectiveLocale = user?.locale ?? tenant?.locale
  useEffect(() => {
    if (effectiveLocale) {
      i18n.changeLanguage(effectiveLocale)
    }
  }, [effectiveLocale, i18n])

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
      const lang = freshUser.locale ?? freshTenant.locale
      if (lang) {
        i18n.changeLanguage(lang)
      }
    }).catch(() => {
      // Silencieux — le cache localStorage reste valide si l'appel échoue
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Uniquement au montage

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Zone principale — décalée par la sidebar sur desktop */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

        {/* Bannière d'alerte abonnement — visible si expiration dans ≤ 7 jours */}
        <SubscriptionBanner subscription={subscription} />

        <main className="flex-1 px-4 py-6 pb-20 lg:px-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Barre de navigation fixe en bas — mobile uniquement */}
      <BottomNav onMenuOpen={() => setSidebarOpen(true)} />

      <ToastContainer />
    </div>
  )
}
