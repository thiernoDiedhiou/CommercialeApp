import { useAuthStore } from '@/store/authStore'
import { NAV_ITEMS } from '@/lib/navItems'

/** Première page accessible — utilisée comme destination du logo sidebar. */
export function useHomePath(): string {
  const permissions = useAuthStore((s) => s.permissions)
  return NAV_ITEMS.find((item) => permissions.includes(item.permission))?.path ?? '/dashboard'
}

/**
 * Première page accessible hors POS — utilisée comme destination du bouton
 * retour du POS. Retourne null si l'utilisateur n'a accès à aucune autre page.
 */
export function useExitPosPath(): string | null {
  const permissions = useAuthStore((s) => s.permissions)
  return (
    NAV_ITEMS.filter((item) => item.path !== '/pos').find((item) =>
      permissions.includes(item.permission),
    )?.path ?? null
  )
}
