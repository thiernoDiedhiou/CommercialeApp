import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, TenantInfo, SubscriptionInfo, PlanFeatures, Branch } from '@/types'

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

  /** Succursales disponibles pour l'utilisateur courant */
  availableBranches: Branch[]
  /** Succursale active — persistée, injectée dans X-Branch-ID */
  activeBranch: Branch | null

  setAuth: (
    token:              string,
    user:               User,
    permissions:        string[],
    tenant:             TenantInfo,
    subscription?:      SubscriptionInfo | null,
    planFeatures?:      PlanFeatures | null,
    availableBranches?: Branch[],
  ) => void
  setTenantApiKey: (key: string) => void
  setSubscriptionExpired: (value: boolean) => void
  setAvailableBranches: (branches: Branch[]) => void
  setActiveBranch: (branch: Branch) => void
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
      availableBranches:   [],
      activeBranch:        null,

      setAuth: (token, user, permissions, tenant, subscription = null, planFeatures = null, availableBranches) =>
        set((state) => {
          const branches = availableBranches ?? state.availableBranches
          const currentActive = state.activeBranch
          const nextActive = availableBranches !== undefined
            ? (currentActive && branches.some((b) => b.uid === currentActive.uid)
                ? currentActive
                : (branches.find((b) => b.type === 'principal') ?? branches[0] ?? null))
            : currentActive
          return {
            token,
            user,
            permissions,
            tenant,
            subscription,
            planFeatures,
            tenantApiKey: tenant.api_key,
            subscriptionExpired: false,
            availableBranches: branches,
            activeBranch: nextActive,
          }
        }),

      setTenantApiKey: (key) =>
        set({ tenantApiKey: key }),

      setSubscriptionExpired: (value) =>
        set({ subscriptionExpired: value }),

      setAvailableBranches: (branches) => set((state) => ({
        availableBranches: branches,
        // Auto-sélectionne la succursale principale si aucune n'est active ou si l'active n'est plus dans la liste
        activeBranch: state.activeBranch && branches.some((b) => b.uid === state.activeBranch!.uid)
          ? state.activeBranch
          : (branches.find((b) => b.type === 'principal') ?? branches[0] ?? null),
      })),

      setActiveBranch: (branch) =>
        set({ activeBranch: branch }),

      logout: () =>
        set({ token: null, user: null, permissions: [], tenant: null, subscription: null, planFeatures: null, tenantApiKey: '', subscriptionExpired: false, availableBranches: [], activeBranch: null }),
    }),
    {
      name: 'auth',
      // tenantApiKey exclu du persist — restauré depuis /auth/me au prochain montage
      // availableBranches exclu — rechargé depuis l'API au montage
      partialize: (state) => ({
        token:        state.token,
        user:         state.user,
        permissions:  state.permissions,
        tenant:       state.tenant,
        subscription: state.subscription,
        planFeatures: state.planFeatures,
        activeBranch: state.activeBranch,
      }),
    },
  ),
)
