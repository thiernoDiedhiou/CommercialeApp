import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import {
  EyeIcon, EyeSlashIcon, CheckCircleIcon,
  ShoppingCartIcon, CubeIcon, ChartBarIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useTenantStore } from '@/store/tenantStore'
import { resolveTenantSlug } from '@/services/api/public'
import type { LoginResponse } from '@/types'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email:    z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type LoginFormData = z.infer<typeof loginSchema>

const ENV_KEY = import.meta.env.VITE_TENANT_API_KEY ?? ''

const BENEFITS = [
  { icon: ShoppingCartIcon, text: 'Caisse POS, ventes et retours en temps réel' },
  { icon: CubeIcon,         text: 'Stocks, alertes et import CSV en quelques clics' },
  { icon: ChartBarIcon,     text: 'Rapports, factures et boutique en ligne inclus' },
]

// ── Panel gauche — branding ───────────────────────────────────────────────────

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full bg-[linear-gradient(145deg,#2465ed_0%,#4a2db5_50%,#6e33d8_100%)] p-10 text-white">
      <div>
        <img src="/logo_blanc.svg" alt="DiDi Sphere" className="h-9 w-auto mb-12" />

        <h2 className="text-3xl font-extrabold leading-tight mb-4 max-w-xs">
          Gérez votre commerce avec sérénité
        </h2>
        <p className="text-white/70 text-sm leading-relaxed max-w-xs">
          DiDi Sphere centralise tout ce dont votre boutique a besoin — multi-devises, adapté à votre secteur, accessible depuis n'importe quel appareil.
        </p>

        <ul className="mt-8 space-y-4">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm text-white/85 leading-relaxed pt-1">{text}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl bg-white/10 border border-white/20 p-4">
          <p className="text-sm text-white/80 italic leading-relaxed">
            "Depuis qu'on utilise DiDi Sphere, on voit exactement nos ventes du jour et nos
            produits qui manquent — tout ça depuis le téléphone."
          </p>
          <p className="mt-3 text-xs font-semibold text-white/60">— Gérant, boutique de mode, Dakar</p>
        </div>

        <p className="text-xs text-white/40 text-center">
          Sénégal · Côte d'Ivoire · Mali · Guinée · Burkina Faso
        </p>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

function getInitialDark(): boolean {
  const stored = localStorage.getItem('landing-theme')
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function LoginPage() {
  const navigate         = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const setAuth          = useAuthStore((s) => s.setAuth)
  const setTenantApiKey  = useAuthStore((s) => s.setTenantApiKey)
  const applyBrandColors = useTenantStore((s) => s.applyBrandColors)

  // useRef capture les valeurs initiales AVANT que setSearchParams les efface
  const initKey  = useRef(searchParams.get('key')    ?? '')
  const initSlug = useRef(searchParams.get('tenant') ?? '')

  const [tenantKey, setTenantKey]         = useState(initKey.current || ENV_KEY)
  const [slugResolving, setSlugResolving] = useState(!!initSlug.current && !initKey.current && !ENV_KEY)
  const [slugError, setSlugError]         = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [isDark]                          = useState(getInitialDark)

  // Dérivées des refs (stables, ne changent pas après le mount)
  const keyFromUrl  = initKey.current
  const slugFromUrl = initSlug.current

  const showKeyField = !ENV_KEY && !slugFromUrl && !keyFromUrl

  // Supprimer ?key= via setSearchParams (React Router-aware — évite le conflit avec window.history)
  useEffect(() => {
    if (!keyFromUrl) return
    const next: Record<string, string> = {}
    if (slugFromUrl) next.tenant = slugFromUrl
    setSearchParams(next, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Résolution automatique slug → api_key
  useEffect(() => {
    if (!slugFromUrl || keyFromUrl || ENV_KEY) return
    setSlugResolving(true)
    resolveTenantSlug(slugFromUrl)
      .then((key) => { setTenantKey(key); setSlugResolving(false) })
      .catch(() => {
        setSlugError('Boutique introuvable ou inactive.')
        setSlugResolving(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const mutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      setTenantApiKey(tenantKey)
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

  const inputBase = 'block w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#2465ed]/30 focus:border-[#2465ed]'
  const inputOk   = isDark
    ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
  const inputErr  = isDark
    ? 'border-red-600 bg-red-900/20 text-gray-100'
    : 'border-red-300 bg-red-50'

  return (
    <div className={`flex min-h-screen${isDark ? ' dark' : ''}`}>

      {/* ── Gauche : branding ─────────────────────────────────────────────── */}
      <div className="lg:w-[480px] xl:w-[540px] shrink-0">
        <BrandPanel />
      </div>

      {/* ── Droite : formulaire ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 py-12 transition-colors">

        {/* Barre de navigation mobile (logo + retour) */}
        <div className="w-full max-w-md lg:hidden flex items-center justify-between mb-8">
          <img
            src={isDark ? '/logo_blanc.svg' : '/logo_mode_claire.svg'}
            alt="DiDi Sphere" className="h-7 w-auto"
          />
          <Link to="/" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            ← Accueil
          </Link>
        </div>

        <div className="w-full max-w-md">

          {/* En-tête form */}
          <div className="mb-8">
            <div className="hidden lg:flex items-center justify-between mb-8">
              <Link to="/" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                ← Retour à l'accueil
              </Link>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Connexion</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Accédez à votre espace de gestion DiDi Sphere
            </p>
          </div>

          {/* Résolution slug en cours */}
          {slugResolving && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Vérification de votre espace…
            </div>
          )}

          {/* Erreur slug */}
          {slugError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {slugError}
            </div>
          )}

          {/* Carte formulaire */}
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-8">
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} noValidate>

              {/* Erreur globale */}
              {errors.root && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 flex items-start gap-2.5">
                  <svg className="h-4 w-4 text-red-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-400">{errors.root.message}</p>
                </div>
              )}

              {/* Clé d'accès boutique */}
              {showKeyField && (
                <div className="mb-5">
                  <label htmlFor="tenantKey" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Clé d'accès boutique
                  </label>
                  <input
                    id="tenantKey"
                    type="text"
                    value={tenantKey}
                    onChange={(e) => setTenantKey(e.target.value)}
                    placeholder="Fournie par votre administrateur"
                    className={cn(inputBase, inputOk, 'font-mono text-xs')}
                  />
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Identifiant unique de votre boutique
                  </p>
                </div>
              )}

              {/* Email */}
              <div className="mb-4">
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  {...register('email')}
                  className={cn(inputBase, errors.email ? inputErr : inputOk)}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Mot de passe */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mot de passe
                  </label>
                  <Link
                    to={`/mot-de-passe-oublie${
                      slugFromUrl ? `?tenant=${encodeURIComponent(slugFromUrl)}` :
                      keyFromUrl  ? `?key=${encodeURIComponent(keyFromUrl)}` : ''
                    }`}
                    className="text-xs text-[#2465ed] hover:underline"
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
                    className={cn(inputBase, 'pr-11', errors.password ? inputErr : inputOk)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword
                      ? <EyeSlashIcon className="h-4 w-4" />
                      : <EyeIcon      className="h-4 w-4" />
                    }
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Bouton submit */}
              <button
                type="submit"
                disabled={isSubmitting || mutation.isPending || !tenantKey}
                className={cn(
                  'w-full rounded-xl bg-[#2465ed] py-3 px-4 text-sm font-bold text-white',
                  'hover:bg-[#1a4fc4] transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-[#2465ed]/40 focus:ring-offset-2',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
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
                  'Se connecter →'
                )}
              </button>
            </form>
          </div>

          {/* CTA inscription */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="font-semibold text-[#2465ed] hover:underline">
              Démarrer l'essai gratuit de 21 jours
            </Link>
          </p>

          {/* Sécurité */}
          <div className="mt-8 flex items-center justify-center gap-5 text-xs text-gray-400 dark:text-gray-600">
            <span className="flex items-center gap-1.5">
              <LockClosedIcon className="h-3.5 w-3.5" />
              Connexion sécurisée (HTTPS)
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Données isolées par boutique
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
