import { Navigate } from 'react-router-dom'
import { useDomainTenant } from '@/shop/hooks/useDomainTenant'

/**
 * Point d'entrée du shop pour les déploiements sur sous-domaine ou domaine custom.
 *
 * Option 1 — ets18safar.votreapp.sn   → slug extrait du hostname → /shop/ets18safar
 * Option 2 — ets18safar.sn            → résolution via API /resolve-domain → /shop/{slug}
 */
export default function ShopDomainEntry() {
  const { tenant, loading, error } = useDomainTenant()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-gray-600 animate-spin" />
          <p className="text-sm text-gray-500">Chargement de la boutique…</p>
        </div>
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-800">Boutique introuvable</p>
          <p className="text-sm text-gray-500">
            {error ?? 'Aucune boutique associée à ce domaine.'}
          </p>
        </div>
      </div>
    )
  }

  return <Navigate to={`/shop/${tenant.slug}`} replace />
}
