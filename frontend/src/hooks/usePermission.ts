import { useAuthStore } from '@/store/authStore'

/** Retourne true si l'utilisateur possède la permission exacte. */
export function usePermission(permission: string): boolean {
  return useAuthStore((s) => s.permissions.includes(permission))
}

/** Retourne true si l'utilisateur possède AU MOINS UNE des permissions. */
export function useAnyPermission(...permissions: string[]): boolean {
  return useAuthStore((s) => permissions.some((p) => s.permissions.includes(p)))
}

/** Retourne true si l'utilisateur possède TOUTES les permissions. */
export function useAllPermissions(...permissions: string[]): boolean {
  return useAuthStore((s) => permissions.every((p) => s.permissions.includes(p)))
}
