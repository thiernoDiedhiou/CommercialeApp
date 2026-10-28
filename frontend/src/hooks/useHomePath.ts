import { useAuthStore } from '@/store/authStore'
import { NAV_ITEMS } from '@/lib/navItems'

/** Première page accessible — utilisée comme destination du logo sidebar. */
export function useHomePath(): string {
  const permissions = useAuthStore((s) => s.permissions)
  // On cherche d'abord un item direct (avec path), puis le premier enfant accessible
  for (const item of NAV_ITEMS) {
    if (!permissions.includes(item.permission)) continue
    if (item.path) return item.path
    // En-tête de groupe — chercher le premier enfant accessible
    const child = item.children?.find((c) => permissions.includes(c.permission))
    if (child) return child.path
  }
  return '/dashboard'
}

/**
 * Première page accessible hors POS — utilisée comme destination du bouton
 * retour du POS. Retourne null si l'utilisateur n'a accès à aucune autre page.
 */
export function useExitPosPath(): string | null {
  const permissions = useAuthStore((s) => s.permissions)
  for (const item of NAV_ITEMS) {
    if (!permissions.includes(item.permission)) continue
    if (item.path && item.path !== '/pos') return item.path
    if (!item.path) {
      const child = item.children?.find((c) => permissions.includes(c.permission))
      if (child) return child.path
    }
  }
  return null
}
