import { usePermission } from '@/hooks/usePermission'

interface CanDoProps {
  permission: string
  children: React.ReactNode
  /** Affiché si la permission est absente (ex: message d'accès refusé) */
  fallback?: React.ReactNode
}

/**
 * Rend ses enfants uniquement si l'utilisateur a la permission requise.
 *
 * @example
 * <CanDo permission="products.create">
 *   <button>Nouveau produit</button>
 * </CanDo>
 */
export default function CanDo({ permission, children, fallback = null }: CanDoProps) {
  const allowed = usePermission(permission)
  return <>{allowed ? children : fallback}</>
}
