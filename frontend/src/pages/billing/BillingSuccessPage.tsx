import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import type { LoginResponse } from '@/types'

export default function BillingSuccessPage() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const qc             = useQueryClient()
  const setAuth        = useAuthStore((s) => s.setAuth)
  const token          = useAuthStore((s) => s.token)
  const user           = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!token || !user) return

    const providerToken = searchParams.get('token')

    const verifyAndRefresh = async () => {
      // Fallback : si le webhook PayDunya n'est pas encore arrivé, on interroge
      // directement le provider. Évite qu'un tenant ait payé sans avoir accès.
      if (providerToken) {
        await apiClient
          .get(`/api/v1/billing/verify?token=${providerToken}`)
          .catch(() => {})
      }

      // Rafraîchit les données auth (subscription, subscriptionExpired…)
      const res = await apiClient
        .get<{ data: LoginResponse['data'] }>('/api/v1/auth/me')
        .catch(() => null)

      if (res) {
        const currentToken = useAuthStore.getState().token
        if (!currentToken) return
        const { user: u, permissions, tenant, subscription, plan_features } = res.data.data
        setAuth(currentToken, u, permissions, tenant, subscription, plan_features)
        qc.invalidateQueries({ queryKey: ['dashboard'] })
      }
    }

    verifyAndRefresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-8 text-center">
        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Paiement confirmé !
        </h1>
        <p className="text-gray-500 mb-6">
          Votre abonnement a été activé avec succès.
          Vous avez maintenant accès à toutes les fonctionnalités de votre plan.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-full rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Accéder à mon espace →
        </button>
      </div>
    </div>
  )
}
