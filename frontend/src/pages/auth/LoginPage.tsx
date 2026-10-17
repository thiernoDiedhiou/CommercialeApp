import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import {
  EyeIcon, EyeSlashIcon,
  CurrencyDollarIcon, BuildingStorefrontIcon,
  DevicePhoneMobileIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline'
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

const FEATURES = [
  { Icon: CurrencyDollarIcon,    text: 'Multi-devises : XOF, EUR, USD et plus' },
  { Icon: BuildingStorefrontIcon, text: '8 secteurs d\'activité supportés' },
  { Icon: DevicePhoneMobileIcon,  text: 'Accessible sur tous vos appareils' },
  { Icon: ShieldCheckIcon,        text: 'Données sécurisées et sauvegardées' },
]

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
      <div className="min-h-screen lg:grid lg:grid-cols-2">

        {/* ── Panneau gauche — Branding (desktop uniquement) ───────────────── */}
        <div className="hidden lg:flex flex-col min-h-screen bg-gradient-to-br from-[#06112a] via-[#0d1e56] to-[#1a45a0] relative overflow-hidden">

          {/* Motif grille de points */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />

          {/* Halos lumineux */}
          <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-[#2465ed]/25 blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-[#6e33d8]/20 blur-[90px] pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full p-12">

            {/* Logo */}
            <div>
              <img
                src="/logo_mode_sombre_texte_claire.svg"
                alt="DiDi Sphere"
                className="h-10 [mix-blend-mode:screen]"
              />
            </div>

            {/* Accroche */}
            <div className="flex-1 flex flex-col justify-center py-12">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs text-white/80 font-medium w-fit mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Essai gratuit · Aucune carte requise
              </span>

              <h2 className="text-3xl font-bold text-white leading-snug">
                Gérez votre boutique<br />
                <span className="text-[#7ca9f8]">comme un pro.</span>
              </h2>
              <p className="mt-4 text-sm text-white/55 leading-relaxed max-w-xs">
                La solution de gestion commerciale conçue pour les PME d'Afrique de l'Ouest.
                Ventes, stock, factures et caisse — tout en un.
              </p>

              {/* Features */}
              <ul className="mt-10 space-y-3.5">
                {FEATURES.map(({ Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-white/80" />
                    </div>
                    <span className="text-sm text-white/70">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Témoignage */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-white/75 leading-relaxed italic">
                "DiDi Sphere a transformé ma gestion quotidienne. Je suis mes ventes, mon stock et mes créances depuis mon téléphone."
              </p>
              <div className="mt-4 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  AD
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Aminata Diallo</p>
                  <p className="text-xs text-white/45">Boutique Aminata Mode, Dakar</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Panneau droit — Formulaire ───────────────────────────────────── */}
        <div className={cn(
          'flex flex-col items-center justify-center min-h-screen px-6 py-12 relative overflow-hidden',
          isDark ? 'bg-[#0c0e1a]' : 'bg-[#f4f7ff]',
        )}>

          {/* Blobs décoratifs (fond) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -top-32 -right-32 h-[400px] w-[400px] rounded-full bg-[#2465ed]/8 blur-[100px] dark:bg-[#2465ed]/5" />
            <div className="absolute -bottom-24 -left-24 h-[300px] w-[300px] rounded-full bg-[#6e33d8]/6 blur-[80px] dark:bg-[#6e33d8]/4" />
          </div>

          <div className="relative w-full max-w-[400px]">

            {/* Logo mobile (caché sur desktop car il est dans le panneau gauche) */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              <img
                src={isDark ? '/logo_mode_sombre_texte_claire.svg' : '/logo_mode_claire.svg'}
                alt="DiDi Sphere"
                className={`h-12 w-auto${isDark ? ' [mix-blend-mode:screen]' : ''}`}
              />
            </div>

            {/* En-tête formulaire */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Bon retour 👋
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Connectez-vous à votre espace de gestion
              </p>
            </div>

            {/* Carte formulaire */}
            <div className={cn(
              'rounded-2xl p-7',
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
                    autoFocus
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
                Essai gratuit de 21 jours →
              </Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  )
}
