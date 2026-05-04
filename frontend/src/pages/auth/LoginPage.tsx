import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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

export default function LoginPage() {
  const navigate         = useNavigate()
  const setAuth          = useAuthStore((s) => s.setAuth)
  const applyBrandColors = useTenantStore((s) => s.applyBrandColors)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: LoginFormData) =>
      apiClient
        .post<LoginResponse>('/api/v1/auth/login', data)
        .then((r) => r.data),

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
        {/* En-tête */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Gestion Commerciale</h1>
          <p className="mt-1 text-sm text-gray-500">Connectez-vous à votre espace</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <form
            onSubmit={handleSubmit((d) => mutation.mutate(d))}
            noValidate
          >
            {/* Erreur globale (identifiants incorrects, etc.) */}
            {errors.root && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            {/* Email */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
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

            {/* Mot de passe */}
            <div className="mb-6">
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
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

            {/* Bouton soumettre */}
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
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
