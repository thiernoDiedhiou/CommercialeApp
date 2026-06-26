import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, TenantInfo, SubscriptionInfo, PlanFeatures } from '@/types'

interface AuthState {
  token:        string | null
  user:         User | null
  permissions:  string[]
  tenant:       TenantInfo | null
  subscription: SubscriptionInfo | null
  planFeatures: PlanFeatures | null
  // Jamais persisté — retourné par /auth/login et /auth/me, perdu à la fermeture de l'onglet
  tenantApiKey: string

  /** true dès qu'un 402 SUBSCRIPTION_EXPIRED est reçu — source de vérité côté frontend */
  subscriptionExpired: boolean

  setAuth: (
    token:        string,
    user:         User,
    permissions:  string[],
    tenant:       TenantInfo,
    subscription?: SubscriptionInfo | null,
    planFeatures?: PlanFeatures | null,
  ) => void
  setTenantApiKey: (key: string) => void
  setSubscriptionExpired: (value: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:               null,
      user:                null,
      permissions:         [],
      tenant:              null,
      subscription:        null,
      planFeatures:        null,
      tenantApiKey:        '',
      subscriptionExpired: false,

      setAuth: (token, user, permissions, tenant, subscription = null, planFeatures = null) =>
        set({ token, user, permissions, tenant, subscription, planFeatures, tenantApiKey: tenant.api_key, subscriptionExpired: false }),

      setTenantApiKey: (key) =>
        set({ tenantApiKey: key }),

      setSubscriptionExpired: (value) =>
        set({ subscriptionExpired: value }),

      logout: () =>
        set({ token: null, user: null, permissions: [], tenant: null, subscription: null, planFeatures: null, tenantApiKey: '', subscriptionExpired: false }),
    }),
    {
      name: 'auth',
      // tenantApiKey exclu du persist — restauré depuis /auth/me au prochain montage
      partialize: (state) => ({
        token:        state.token,
        user:         state.user,
        permissions:  state.permissions,
        tenant:       state.tenant,
        subscription: state.subscription,
        planFeatures: state.planFeatures,
      }),
    },
  ),
)
