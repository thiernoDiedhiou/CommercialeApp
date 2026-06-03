import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { resolveTenantSlug } from '@/services/api/public'
import { cn } from '@/lib/utils'

const ENV_KEY = import.meta.env.VITE_TENANT_API_KEY ?? ''

function getInitialDark(): boolean {
  const stored = localStorage.getItem('landing-theme')
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function ForgotPasswordPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const setTenantApiKey = useAuthStore((s) => s.setTenantApiKey)

  const initKey  = useRef(searchParams.get('key')    ?? '')
  const initSlug = useRef(searchParams.get('tenant') ?? '')
  const initEmail = useRef(searchParams.get('email') ?? '')

  const keyFromUrl  = initKey.current
  const slugFromUrl = initSlug.current

  const [tenantKey, setTenantKey]         = useState(keyFromUrl || ENV_KEY)
  const [slugResolving, setSlugResolving] = useState(!!slugFromUrl && !keyFromUrl && !ENV_KEY)
  const [email, setEmail]                 = useState(initEmail.current)
  const [isDark]                          = useState(getInitialDark)

  const showKeyField = !ENV_KEY && !slugFromUrl && !keyFromUrl

  // Supprimer ?key= via setSearchParams (React Router-aware)
  useEffect(() => {
    if (!keyFromUrl) return
    const next: Record<string, string> = {}
    if (slugFromUrl) next.tenant = slugFromUrl
    setSearchParams(next, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Résolution slug → api_key
  useEffect(() => {
    if (!slugFromUrl || keyFromUrl || ENV_KEY) return
    setSlugResolving(true)
    resolveTenantSlug(slugFromUrl)
      .then((key) => { setTenantKey(key); setSlugResolving(false) })
      .catch(() => setSlugResolving(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: async () => {
      setTenantApiKey(tenantKey)
      return apiClient
        .post('/api/v1/auth/forgot-password', { email })
        .then((r) => r.data)
    },
  })

  const inputBase = 'block w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:border-[#2465ed]'
  const inputOk   = isDark
    ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 focus:ring-[#2465ed]/30'
    : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#2465ed]/30'

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 py-12 transition-colors">

        <div className="w-full max-w-md">

          {/* Nav */}
          <div className="flex items-center justify-between mb-8">
            <img
              src={isDark ? '/logo_blanc.svg' : '/logo_mode_claire.svg'}
              alt="DiDi Sphere"
              className="h-7 w-auto"
            />
            <Link to={`/login${slugFromUrl ? `?tenant=${slugFromUrl}` : keyFromUrl ? `?key=${keyFromUrl}` : ''}`}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              ← Retour à la connexion
            </Link>
          </div>

          {/* Succès */}
          {mutation.isSuccess ? (
            <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ds-green/10 dark:bg-ds-green/20">
                  <EnvelopeIcon className="h-8 w-8 text-ds-green" />
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Email envoyé !</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                Si un compte est associé à <strong className="text-gray-700 dark:text-gray-300">{email}</strong>,
                vous recevrez dans quelques minutes un lien pour réinitialiser votre mot de passe.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                Vérifiez aussi votre dossier spam.
              </p>
              <Link
                to={`/login${slugFromUrl ? `?tenant=${slugFromUrl}` : keyFromUrl ? `?key=${keyFromUrl}` : ''}`}
                className="inline-block w-full text-center rounded-xl bg-[#2465ed] py-3 text-sm font-bold text-white hover:bg-[#1a4fc4] transition-colors"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              {slugResolving && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Vérification de votre espace…
                </div>
              )}

              <div className="mb-8">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                  Mot de passe oublié ?
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-8">

                {mutation.isError && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    {axios.isAxiosError(mutation.error)
                      ? (mutation.error.response?.data as any)?.message ?? 'Une erreur est survenue.'
                      : 'Une erreur est survenue.'
                    }
                  </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>

                  {/* Clé boutique */}
                  {showKeyField && (
                    <div className="mb-4">
                      <label htmlFor="fk-tenantKey" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Clé d'accès boutique
                      </label>
                      <input
                        id="fk-tenantKey"
                        type="text"
                        value={tenantKey}
                        onChange={(e) => setTenantKey(e.target.value)}
                        placeholder="Fournie par votre administrateur"
                        className={cn(inputBase, inputOk, 'font-mono text-xs')}
                      />
                    </div>
                  )}

                  {/* Email */}
                  <div className="mb-6">
                    <label htmlFor="fk-email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Adresse email
                    </label>
                    <input
                      id="fk-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="vous@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(inputBase, inputOk)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={mutation.isPending || !email || !tenantKey}
                    className="w-full rounded-xl bg-[#2465ed] py-3 px-4 text-sm font-bold text-white hover:bg-[#1a4fc4] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {mutation.isPending ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Envoi en cours…
                      </>
                    ) : (
                      'Envoyer le lien de réinitialisation'
                    )}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* Sécurité */}
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-gray-400 dark:text-gray-600">
            <span className="flex items-center gap-1.5">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Lien valide 60 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Connexion sécurisée (HTTPS)
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
