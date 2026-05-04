import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, TenantInfo } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  permissions: string[]
  tenant: TenantInfo | null

  setAuth: (token: string, user: User, permissions: string[], tenant: TenantInfo) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      permissions: [],
      tenant: null,

      setAuth: (token, user, permissions, tenant) =>
        set({ token, user, permissions, tenant }),

      logout: () =>
        set({ token: null, user: null, permissions: [], tenant: null }),
    }),
    {
      name: 'auth', // clé localStorage
    },
  ),
)
