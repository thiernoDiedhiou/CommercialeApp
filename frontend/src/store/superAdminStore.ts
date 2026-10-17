import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SuperAdminInfo {
  id: number
  name: string
  email: string
  avatar: string | null
}

interface SuperAdminState {
  token: string | null
  admin: SuperAdminInfo | null
  setAuth:   (token: string, admin: SuperAdminInfo) => void
  updateAdmin: (admin: SuperAdminInfo) => void
  logout:    () => void
}

export const useSuperAdminStore = create<SuperAdminState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      setAuth:     (token, admin) => set({ token, admin }),
      updateAdmin: (admin)        => set({ admin }),
      logout:      ()             => set({ token: null, admin: null }),
    }),
    { name: 'super-admin-auth' },
  ),
)
