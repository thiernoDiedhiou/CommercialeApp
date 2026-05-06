import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SuperAdminInfo {
  id: number
  name: string
  email: string
}

interface SuperAdminState {
  token: string | null
  admin: SuperAdminInfo | null
  setAuth: (token: string, admin: SuperAdminInfo) => void
  logout: () => void
}

export const useSuperAdminStore = create<SuperAdminState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      setAuth: (token, admin) => set({ token, admin }),
      logout: () => set({ token: null, admin: null }),
    }),
    { name: 'super-admin-auth' },
  ),
)
