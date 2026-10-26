import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
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
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token || !user) {
      setStatus('error')
      return
    }

    const providerToken = searchParams.get('token')

    const verifyAndRefresh = async () => {
      try {
        if (providerToken) {
          await apiClient
            .get(`/api/v1/billing/verify?token=${providerToken}`)
            .catch(() => {})
        }

        const res = await apiClient
          .get<{ data: LoginResponse['data'] }>('/api/v1/auth/me')
          .catch(() => null)

        if (res) {
          const currentToken = useAuthStore.getState().token
          if (!currentToken) {
            setStatus('error')
            return
          }
          const { user: u, permissions, tenant, subscription, plan_features, available_branches } = res.data.data
          setAuth(currentToken, u, permissions, tenant, subscription, plan_features, available_branches ?? [])
          qc.invalidateQueries({ queryKey: ['dashboard'] })
        }

        setStatus('success')
      } catch {
        setStatus('error')
      }
    }

    verifyAndRefresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 p-8 text-center">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Vérification en cours…</h1>
          <p className="text-gray-500 dark:text-gray-400">Confirmation de votre paiement.</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 p-8 text-center">
          <ExclamationCircleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Vérification incomplète</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Votre paiement est en cours de traitement. Si l'accès n'est pas encore disponible,
            rafraîchissez la page dans quelques instants.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Accéder à mon espace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 p-8 text-center">
        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Paiement confirmé !
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
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
