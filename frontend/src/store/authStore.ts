import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, TenantInfo } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  permissions: string[]
  tenant: TenantInfo | null
  tenantApiKey: string

  setAuth: (token: string, user: User, permissions: string[], tenant: TenantInfo) => void
  setTenantApiKey: (key: string) => void
  logout: () => void
}

const DEFAULT_KEY = import.meta.env.VITE_TENANT_API_KEY ?? ''

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      permissions: [],
      tenant: null,
      tenantApiKey: DEFAULT_KEY,

      setAuth: (token, user, permissions, tenant) =>
        set({ token, user, permissions, tenant }),

      setTenantApiKey: (key) =>
        set({ tenantApiKey: key }),

      logout: () =>
        set({ token: null, user: null, permissions: [], tenant: null, tenantApiKey: DEFAULT_KEY }),
    }),
    {
      name: 'auth',
    },
  ),
)
