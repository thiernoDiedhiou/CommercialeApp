import { useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { CheckCircleIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import publicAxios from '@/lib/publicAxios'
import { cn } from '@/lib/utils'

const schema = z.object({
  password:              z.string().min(8, '8 caractères minimum'),
  password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path:    ['password_confirmation'],
})

type FormData = z.infer<typeof schema>

function getInitialDark(): boolean {
  const stored = localStorage.getItem('landing-theme')
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function ResetPasswordPage() {
  const navigate          = useNavigate()
  const [searchParams]    = useSearchParams()

  // Token et email extraits de l'URL — générés par le backend et envoyés par email
  const tokenFromUrl = useRef(searchParams.get('token') ?? '').current
  const emailFromUrl = useRef(searchParams.get('email') ?? '').current

  const [showPwd, setShowPwd] = useState(false)
  const [showCfm, setShowCfm] = useState(false)
  const [isDark]              = useState(getInitialDark)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const r = await publicAxios.post('/api/v1/auth/reset-password', {
        email:                 emailFromUrl,
        token:                 tokenFromUrl,
        password:              data.password,
        password_confirmation: data.password_confirmation,
      })
      return r.data
    },
  })

  const inputBase = 'block w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#2465ed]/30 focus:border-[#2465ed]'
  const inputOk   = isDark
    ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
  const inputErr  = isDark
    ? 'border-red-600 bg-red-900/20 text-gray-100 focus:ring-red-500/30'
    : 'border-red-300 bg-red-50 focus:ring-red-300/30'

  // Lien invalide — token ou email absent de l'URL
  if (!tokenFromUrl || !emailFromUrl) {
    return (
      <div className={isDark ? 'dark' : ''}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 transition-colors">
          <div className="w-full max-w-md text-center">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-3">Lien invalide</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Ce lien de réinitialisation est incomplet ou a déjà été utilisé.
            </p>
            <Link to="/mot-de-passe-oublie"
              className="inline-block rounded-xl bg-[#2465ed] px-6 py-3 text-sm font-bold text-white hover:bg-[#1a4fc4] transition-colors"
            >
              Demander un nouveau lien
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 py-12 transition-colors">
        <div className="w-full max-w-md">

          <div className="flex items-center justify-between mb-8">
            <img src={isDark ? '/logo_blanc.svg' : '/logo_mode_claire.svg'} alt="DiDi Sphere" className="h-7 w-auto" />
          </div>

          {mutation.isSuccess ? (
            <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-8 text-center">
              <CheckCircleIcon className="h-16 w-16 text-ds-green mx-auto mb-4" />
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Mot de passe modifié !</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full rounded-xl bg-[#2465ed] py-3 text-sm font-bold text-white hover:bg-[#1a4fc4] transition-colors"
              >
                Se connecter →
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Nouveau mot de passe</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choisissez un mot de passe sécurisé d'au moins 8 caractères.
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-8">

                {mutation.isError && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 flex items-start gap-2.5">
                    <svg className="h-4 w-4 text-red-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {axios.isAxiosError(mutation.error)
                        ? (mutation.error.response?.data as { message?: string })?.message ?? 'Une erreur est survenue.'
                        : 'Une erreur est survenue.'}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Compte</label>
                    <p className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {emailFromUrl}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="rp-password" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="rp-password"
                        type={showPwd ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="8 caractères minimum"
                        {...register('password')}
                        className={cn(inputBase, 'pr-11', errors.password ? inputErr : inputOk)}
                      />
                      <button type="button" onClick={() => setShowPwd((v) => !v)}
                        aria-label={showPwd ? 'Masquer' : 'Afficher'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPwd ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="rp-confirm" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="rp-confirm"
                        type={showCfm ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Répétez le mot de passe"
                        {...register('password_confirmation')}
                        className={cn(inputBase, 'pr-11', errors.password_confirmation ? inputErr : inputOk)}
                      />
                      <button type="button" onClick={() => setShowCfm((v) => !v)}
                        aria-label={showCfm ? 'Masquer' : 'Afficher'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showCfm ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password_confirmation && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.password_confirmation.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full rounded-xl bg-[#2465ed] py-3 text-sm font-bold text-white hover:bg-[#1a4fc4] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    {mutation.isPending ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Réinitialisation…
                      </>
                    ) : (
                      'Enregistrer le nouveau mot de passe →'
                    )}
                  </button>
                </form>
              </div>

              <p className="mt-6 text-center text-sm text-gray-400 dark:text-gray-500">
                Lien invalide ou expiré ?{' '}
                <Link to="/mot-de-passe-oublie" className="text-[#2465ed] hover:underline">
                  Demander un nouveau lien
                </Link>
              </p>
            </>
          )}

          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-gray-400 dark:text-gray-600">
            <span className="flex items-center gap-1.5">
              <LockClosedIcon className="h-3.5 w-3.5" />
              Connexion sécurisée (HTTPS)
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
