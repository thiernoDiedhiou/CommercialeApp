import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useTenantStore } from '@/store/tenantStore'
import type { LoginResponse } from '@/types'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email:    z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type LoginFormData = z.infer<typeof loginSchema>

const ENV_KEY = import.meta.env.VITE_TENANT_API_KEY ?? ''

export default function LoginPage() {
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const setAuth          = useAuthStore((s) => s.setAuth)
  const setTenantApiKey  = useAuthStore((s) => s.setTenantApiKey)
  const applyBrandColors = useTenantStore((s) => s.applyBrandColors)

  // Priorité : URL ?key= > env VITE_TENANT_API_KEY > store actuel
  const keyFromUrl = searchParams.get('key') ?? ''
  const [tenantKey, setTenantKey] = useState(keyFromUrl || ENV_KEY)

  // Affiche le champ si aucune clé n'est préconfigurée dans l'env (développement multi-tenant)
  const showKeyField = !ENV_KEY || !!keyFromUrl

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const mutation = useMutation({
    mutationFn: (data: LoginFormData) => {
      // Applique la clé tenant AVANT la requête pour que l'intercepteur l'utilise
      setTenantApiKey(tenantKey)
      return apiClient
        .post<LoginResponse>('/api/v1/auth/login', data)
        .then((r) => r.data)
    },
    onSuccess: ({ token, data: { user, permissions, tenant } }) => {
      setAuth(token, user, permissions, tenant)
      applyBrandColors(tenant.primary_color, tenant.secondary_color)
      navigate('/dashboard', { replace: true })
    },
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message ??
          'Une erreur est survenue. Réessayez.'
        : 'Une erreur est survenue. Réessayez.'
      setError('root', { message })
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Gestion Commerciale</h1>
          <p className="mt-1 text-sm text-gray-500">Connectez-vous à votre espace</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} noValidate>
            {errors.root && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            {/* Clé d'accès boutique — visible uniquement si aucune clé env configurée */}
            {showKeyField && (
              <div className="mb-4">
                <label htmlFor="tenantKey" className="mb-1 block text-sm font-medium text-gray-700">
                  Clé d'accès boutique
                </label>
                <input
                  id="tenantKey"
                  type="text"
                  value={tenantKey}
                  onChange={(e) => setTenantKey(e.target.value)}
                  placeholder="Fournie par votre administrateur"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-mono transition-colors hover:border-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Identifiant unique de votre boutique
                </p>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className={cn(
                  'block w-full rounded-lg border px-3 py-2.5 text-sm transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent',
                  errors.email
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 bg-white hover:border-gray-400',
                )}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className={cn(
                  'block w-full rounded-lg border px-3 py-2.5 text-sm transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent',
                  errors.password
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 bg-white hover:border-gray-400',
                )}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending || !tenantKey}
              className={cn(
                'w-full rounded-lg bg-brand-primary py-2.5 px-4 text-sm font-semibold text-white',
                'hover:opacity-90 transition-opacity',
                'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {mutation.isPending ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
