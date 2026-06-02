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
  tenantApiKey: string

  setAuth: (
    token:        string,
    user:         User,
    permissions:  string[],
    tenant:       TenantInfo,
    subscription?: SubscriptionInfo | null,
    planFeatures?: PlanFeatures | null,
  ) => void
  setTenantApiKey: (key: string) => void
  logout: () => void
}

const DEFAULT_KEY = import.meta.env.VITE_TENANT_API_KEY ?? ''

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:        null,
      user:         null,
      permissions:  [],
      tenant:       null,
      subscription: null,
      planFeatures: null,
      tenantApiKey: DEFAULT_KEY,

      setAuth: (token, user, permissions, tenant, subscription = null, planFeatures = null) =>
        set({ token, user, permissions, tenant, subscription, planFeatures }),

      setTenantApiKey: (key) =>
        set({ tenantApiKey: key }),

      logout: () =>
        set({ token: null, user: null, permissions: [], tenant: null, subscription: null, planFeatures: null, tenantApiKey: DEFAULT_KEY }),
    }),
    {
      name: 'auth',
    },
  ),
)
