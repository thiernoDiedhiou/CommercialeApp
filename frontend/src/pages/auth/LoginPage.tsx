import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
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

function getInitialDark(): boolean {
  const stored = localStorage.getItem('landing-theme')
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function LoginPage() {
  const navigate         = useNavigate()
  const setAuth          = useAuthStore((s) => s.setAuth)
  const applyBrandColors = useTenantStore((s) => s.applyBrandColors)

  const [showPassword, setShowPassword] = useState(false)
  const [isDark]                        = useState(getInitialDark)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const mutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const r = await apiClient.post<LoginResponse>('/api/v1/auth/login', data)
      return r.data
    },
    onSuccess: ({ token, data: { user, permissions, tenant, subscription, plan_features } }) => {
      setAuth(token, user, permissions, tenant, subscription, plan_features)
      applyBrandColors(tenant.primary_color, tenant.secondary_color)
      navigate('/dashboard', { replace: true })
    },
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message ?? 'Identifiants incorrects. Réessayez.'
        : 'Une erreur est survenue. Réessayez.'
      setError('root', { message })
    },
  })

  const input = cn(
    'block w-full rounded-xl border px-4 py-3.5 text-sm transition-all duration-150',
    'focus:outline-none focus:ring-2 focus:ring-[#2465ed]/30 focus:border-[#2465ed]',
    isDark
      ? 'border-white/10 bg-white/5 text-gray-100 placeholder-gray-500'
      : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-300',
  )
  const inputError = cn(
    'block w-full rounded-xl border px-4 py-3.5 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400',
    isDark ? 'border-red-600/50 bg-red-900/10 text-gray-100' : 'border-red-300 bg-red-50 text-gray-900',
  )

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-[#f4f7ff] dark:bg-[#0c0e1a] transition-colors">

        {/* ── Blobs décoratifs ─────────────────────────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#2465ed]/10 blur-[100px] dark:bg-[#2465ed]/5" />
          <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-[#6e33d8]/8 blur-[80px] dark:bg-[#6e33d8]/4" />
        </div>

        {/* ── Contenu centré ───────────────────────────────────────────────── */}
        <div className="relative w-full max-w-[420px] flex flex-col">

          {/* Logo + en-tête */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="relative mb-5 inline-flex">
              <div className="absolute inset-0 rounded-2xl bg-[#2465ed]/20 dark:bg-[#2465ed]/10 blur-2xl scale-150" />
              <img
                src={isDark ? '/logo_blanc.svg' : '/logo_mode_claire.svg'}
                alt="DiDi Sphere"
                className="relative h-11 w-auto"
              />
            </div>
            <h1 className="text-[1.6rem] font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              Bienvenue
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Connectez-vous à votre espace de gestion
            </p>
          </div>

          {/* Carte formulaire */}
          <div className={cn(
            'rounded-2xl p-8',
            isDark
              ? 'bg-white/[0.04] border border-white/8 backdrop-blur-md'
              : 'bg-white border border-gray-100 shadow-[0_8px_48px_-8px_rgba(36,101,237,0.12),0_2px_12px_-4px_rgba(0,0,0,0.06)]',
          )}>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} noValidate className="space-y-5">

              {/* Erreur globale */}
              {errors.root && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/15 dark:border-red-800/50 px-4 py-3 flex items-start gap-2.5">
                  <svg className="h-4 w-4 text-red-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-400">{errors.root.message}</p>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  {...register('email')}
                  className={errors.email ? inputError : input}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Mot de passe */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mot de passe
                  </label>
                  <Link
                    to="/mot-de-passe-oublie"
                    className="text-xs text-[#2465ed] hover:text-[#1a4fc4] transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={cn(errors.password ? inputError : input, 'pr-11')}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Bouton */}
              <button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className={cn(
                  'relative w-full rounded-xl py-3.5 px-4 text-sm font-semibold text-white',
                  'bg-gradient-to-r from-[#2465ed] to-[#5b3fd4]',
                  'shadow-lg shadow-[#2465ed]/25 dark:shadow-[#2465ed]/15',
                  'hover:from-[#1a53d4] hover:to-[#4a33c4] hover:shadow-xl hover:shadow-[#2465ed]/30',
                  'focus:outline-none focus:ring-2 focus:ring-[#2465ed]/50 focus:ring-offset-2 dark:focus:ring-offset-transparent',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                  'flex items-center justify-center gap-2',
                )}
              >
                {mutation.isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connexion en cours…
                  </>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Se connecter
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                )}
              </button>

            </form>
          </div>

          {/* CTA inscription */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="font-semibold text-[#2465ed] hover:text-[#1a4fc4] transition-colors">
              Essai gratuit de 21 jours
            </Link>
          </p>

          {/* Footer  */}
          <p className="mt-8 text-center text-[11px] tracking-wide text-gray-400/60 dark:text-gray-600">
           {/* Footer contenu */}
          </p>

        </div>
      </div>
    </div>
  )
}
