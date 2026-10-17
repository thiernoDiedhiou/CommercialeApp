import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { z } from 'zod'
import SeoHead from '@/landing/components/SeoHead'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerTenant, type RegisterData } from '@/services/api/public'
import { getApiErrorMessage } from '@/lib/errors'
import {
  EyeIcon, EyeSlashIcon, CheckCircleIcon, CheckIcon,
  BuildingStorefrontIcon, CakeIcon, SwatchIcon, SparklesIcon,
  BeakerIcon, ComputerDesktopIcon, WrenchScrewdriverIcon, GlobeAltIcon,
} from '@heroicons/react/24/outline'
import PhoneInput, { normalizePhone } from '@/components/ui/PhoneInput'

const SECTOR_VALUES = ['general', 'food', 'fashion', 'cosmetic', 'pharmacy', 'electronics', 'services', 'ecommerce'] as const

const schema = z.object({
  company_name:   z.string().min(2, 'Nom requis (2 caractères min)').max(150),
  sector:         z.enum(SECTOR_VALUES, { message: 'Secteur requis' }),
  phone:          z.string().min(8, 'Numéro requis — indicatif + numéro local'),
  phone_country:  z.string().optional(),
  admin_name:     z.string().min(2, 'Votre nom est requis').max(150),
  admin_email:    z.string().email('Email invalide'),
  admin_password: z.string().min(8, '8 caractères minimum'),
  confirm:        z.string().min(1, 'Veuillez confirmer votre mot de passe'),
}).refine((d) => d.admin_password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path:    ['confirm'],
})

type FormData = z.infer<typeof schema>

const SECTORS: { value: string; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { value: 'general',     label: 'Commerce général',    Icon: BuildingStorefrontIcon },
  { value: 'food',        label: 'Alimentation',        Icon: CakeIcon               },
  { value: 'fashion',     label: 'Mode & vêtements',    Icon: SwatchIcon             },
  { value: 'cosmetic',    label: 'Cosmétique & beauté', Icon: SparklesIcon           },
  { value: 'pharmacy',    label: 'Pharmacie',           Icon: BeakerIcon             },
  { value: 'electronics', label: 'Électronique',        Icon: ComputerDesktopIcon    },
  { value: 'services',    label: 'Services',            Icon: WrenchScrewdriverIcon  },
  { value: 'ecommerce',   label: 'E-commerce',          Icon: GlobeAltIcon           },
]

function getPasswordStrength(pwd: string): { score: number; label: string; color: string; textColor: string } {
  if (!pwd || pwd.length < 8) return { score: 0, label: '', color: '', textColor: '' }
  let score = 1
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  const meta = [
    { label: '',       color: '',               textColor: '' },
    { label: 'Faible', color: 'bg-red-400',     textColor: 'text-red-500' },
    { label: 'Moyen',  color: 'bg-orange-400',  textColor: 'text-orange-500' },
    { label: 'Bon',    color: 'bg-yellow-400',  textColor: 'text-yellow-600' },
    { label: 'Fort',   color: 'bg-green-500',   textColor: 'text-green-600' },
  ]
  return { score, ...meta[score] }
}

const inputCls = 'w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 outline-none transition'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep]           = useState<1 | 2>(1)
  const [showPwd, setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess]     = useState<{ name: string; trialDays: number } | null>(null)

  const { register, handleSubmit, control, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sector: 'general', phone: '', phone_country: 'SN', admin_name: '', admin_email: '', admin_password: '', confirm: '' },
  })

  const passwordValue = useWatch({ control, name: 'admin_password' }) ?? ''
  const strength = useMemo(() => getPasswordStrength(passwordValue), [passwordValue])

  const mutation = useMutation({
    mutationFn: (data: RegisterData) => registerTenant(data),
    onSuccess: (res) => {
      const days = parseInt(res.message.match(/(\d+)/)?.[1] ?? '21')
      setSuccess({ name: res.tenant.name, trialDays: days })
    },
  })

  const goToStep2 = async () => {
    const ok = await trigger(['company_name', 'sector', 'phone'])
    if (ok) setStep(2)
  }

  const onSubmit = (data: FormData) => {
    const { confirm: _c, phone, phone_country: _pc, ...rest } = data
    mutation.mutate({ ...rest, phone: normalizePhone(phone) ?? phone })
  }

  // ── Écran de succès ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="h-11 w-11 text-green-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
            Bienvenue sur DiDi Sphere !
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Le compte <span className="font-semibold text-gray-800 dark:text-gray-200">{success.name}</span> a bien été créé.
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Votre essai gratuit de{' '}
            <span className="font-semibold text-green-600 dark:text-green-400">{success.trialDays} jours</span>{' '}
            commence maintenant. Un email de bienvenue vous a été envoyé.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full rounded-xl bg-ds-blue py-3.5 text-sm font-bold text-white hover:bg-ds-blue-dark transition-all shadow-lg shadow-ds-blue/20"
          >
            Accéder à mon espace →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-12">
      <SeoHead
        title="Créer mon compte"
        description="Démarrez votre essai gratuit de 21 jours. Aucune carte bancaire requise. Configurez votre boutique en 3 minutes."
        canonical="/inscription"
      />
      <div className="w-full max-w-lg">

        {/* Logo + titre */}
        <div className="text-center mb-8">
          <img src="/logo_mode_claire.svg" alt="DiDi Sphere" className="h-9 mx-auto mb-6 dark:hidden" />
          <img src="/logo_mode_sombre_texte_claire.svg" alt="DiDi Sphere" className="h-9 mx-auto mb-6 hidden dark:block [mix-blend-mode:screen]" />
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Créer votre compte</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Essai gratuit de 21 jours · Aucune carte bancaire requise
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-8">
          {/* Étape 1 */}
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step >= 1
                ? 'bg-ds-blue text-white shadow-md shadow-ds-blue/30'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}>
              {step > 1 ? <CheckIcon className="h-4 w-4" /> : '1'}
            </div>
            <span className={`mt-1.5 text-xs font-medium transition-colors ${step >= 1 ? 'text-ds-blue' : 'text-gray-400'}`}>
              Votre boutique
            </span>
          </div>

          {/* Connecteur */}
          <div className={`h-0.5 w-20 mx-3 mb-5 rounded-full transition-all duration-300 ${
            step > 1 ? 'bg-ds-blue' : 'bg-gray-200 dark:bg-gray-700'
          }`} />

          {/* Étape 2 */}
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step === 2
                ? 'bg-ds-blue text-white shadow-md shadow-ds-blue/30'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}>
              2
            </div>
            <span className={`mt-1.5 text-xs font-medium transition-colors ${step === 2 ? 'text-ds-blue' : 'text-gray-400'}`}>
              Votre compte
            </span>
          </div>
        </div>

        {/* Erreur globale */}
        {mutation.isError && (
          <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {getApiErrorMessage(mutation.error)}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8">

            {/* ── Étape 1 — Boutique ──────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nom de votre boutique / entreprise <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('company_name')}
                    type="text"
                    autoFocus
                    placeholder="Ex : Boutique Fatou, Boulangerie Dakar…"
                    className={inputCls}
                  />
                  {errors.company_name && (
                    <p className="mt-1 text-xs text-red-500">{errors.company_name.message}</p>
                  )}
                </div>

                {/* Secteur — grille de cartes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Secteur d'activité <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="sector"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-2 gap-2">
                        {SECTORS.map(({ value, label, Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${
                              field.value === value
                                ? 'border-ds-blue bg-ds-blue/5 dark:bg-ds-blue/10 text-ds-blue font-semibold shadow-sm'
                                : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <Icon className={`h-5 w-5 flex-shrink-0 ${field.value === value ? 'text-ds-blue' : 'text-gray-400 dark:text-gray-500'}`} />
                            <span className="leading-tight">{label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  />
                  {errors.sector && (
                    <p className="mt-1 text-xs text-red-500">{errors.sector.message}</p>
                  )}
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <Controller
                        name="phone_country"
                        control={control}
                        render={({ field: countryField }) => (
                          <PhoneInput
                            country={countryField.value ?? 'SN'}
                            onCountryChange={countryField.onChange}
                            error={errors.phone?.message}
                            phoneProps={{
                              value:        field.value ?? '',
                              onChange:     field.onChange,
                              placeholder:  'Saisir le numéro de téléphone',
                              name:         'phone',
                              autoComplete: 'off',
                            }}
                          />
                        )}
                      />
                    )}
                  />
                </div>

                <button
                  type="button"
                  onClick={goToStep2}
                  className="w-full rounded-xl bg-ds-blue py-3.5 text-sm font-bold text-white hover:bg-ds-blue-dark transition-all shadow-lg shadow-ds-blue/20"
                >
                  Continuer →
                </button>
              </div>
            )}

            {/* ── Étape 2 — Compte admin ──────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Votre nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('admin_name')}
                    type="text"
                    autoFocus
                    placeholder="Prénom Nom"
                    className={inputCls}
                  />
                  {errors.admin_name && (
                    <p className="mt-1 text-xs text-red-500">{errors.admin_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Adresse email <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('admin_email')}
                    type="email"
                    placeholder="vous@exemple.com"
                    className={inputCls}
                  />
                  {errors.admin_email && (
                    <p className="mt-1 text-xs text-red-500">{errors.admin_email.message}</p>
                  )}
                </div>

                {/* Mot de passe + force */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register('admin_password')}
                      type={showPwd ? 'text' : 'password'}
                      placeholder="8 caractères minimum"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPwd ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Indicateur de force */}
                  {passwordValue.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              i <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      {strength.label && (
                        <p className={`mt-1 text-xs font-medium ${strength.textColor}`}>
                          {strength.label}
                          {strength.score < 3 && (
                            <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">
                              — ajoutez majuscules, chiffres ou symboles
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                  {errors.admin_password && (
                    <p className="mt-1 text-xs text-red-500">{errors.admin_password.message}</p>
                  )}
                </div>

                {/* Confirmation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Confirmer le mot de passe <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirm')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Répétez le mot de passe"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showConfirm ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p className="mt-1 text-xs text-red-500">{errors.confirm.message}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  >
                    ← Retour
                  </button>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="flex-[2] rounded-xl bg-ds-blue py-3.5 text-sm font-bold text-white hover:bg-ds-blue-dark disabled:opacity-60 transition-all shadow-lg shadow-ds-blue/20"
                  >
                    {mutation.isPending ? 'Création en cours…' : 'Créer mon compte →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-semibold text-ds-blue hover:underline">
            Se connecter
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
          En créant un compte vous acceptez nos{' '}
          <Link to="/cgu" className="underline hover:text-gray-600 dark:hover:text-gray-300">CGU</Link>
          {' '}et notre{' '}
          <Link to="/confidentialite" className="underline hover:text-gray-600 dark:hover:text-gray-300">
            politique de confidentialité
          </Link>.
        </p>
      </div>
    </div>
  )
}
