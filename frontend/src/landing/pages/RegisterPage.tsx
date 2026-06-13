import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerTenant, type RegisterData } from '@/services/api/public'
import { getApiErrorMessage } from '@/lib/errors'
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import PhoneInput, { normalizePhone } from '@/components/ui/PhoneInput'

const SECTOR_VALUES = ['general', 'food', 'fashion', 'cosmetic', 'pharmacy', 'electronics', 'services', 'ecommerce'] as const

const schema = z.object({
  company_name:    z.string().min(2, 'Nom requis (2 caractères min)').max(150),
  sector:          z.enum(SECTOR_VALUES, { message: 'Secteur requis' }),
  phone:           z.string().min(8, 'Numéro requis — indicatif + numéro local'),
  phone_country:   z.string().optional(),
  admin_name:      z.string().min(2, 'Votre nom est requis').max(150),
  admin_email:     z.string().email('Email invalide'),
  admin_password:  z.string().min(8, '8 caractères minimum'),
  confirm:         z.string(),
}).refine((d) => d.admin_password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path:    ['confirm'],
})

type FormData = z.infer<typeof schema>

const SECTORS = [
  { value: 'general',     label: '🛒 Commerce général' },
  { value: 'food',        label: '🍽️ Alimentation & traiteur' },
  { value: 'fashion',     label: '👗 Mode & prêt-à-porter' },
  { value: 'cosmetic',    label: '💄 Cosmétique & beauté' },
  { value: 'ecommerce',   label: '🌐 Commerce électronique' },
  { value: 'pharmacy',    label: '💊 Pharmacie & parapharmacie' },
  { value: 'electronics', label: '💻 Électronique & informatique' },
  { value: 'services',    label: '🔧 Prestations de services' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPwd, setShowPwd]     = useState(false)
  const [success, setSuccess]     = useState<{ name: string; trialDays: number } | null>(null)

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sector: 'general' },
  })

  const mutation = useMutation({
    mutationFn: (data: RegisterData) => registerTenant(data),
    onSuccess: (res) => {
      const days = parseInt(res.message.match(/(\d+)/)?.[1] ?? '21')
      setSuccess({ name: res.tenant.name, trialDays: days })
    },
  })

  const onSubmit = (data: FormData) => {
    const { confirm, phone, phone_country: _pc, ...rest } = data
    mutation.mutate({ ...rest, phone: normalizePhone(phone) ?? phone })
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <CheckCircleIcon className="h-20 w-20 text-ds-green mx-auto mb-6" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            Bienvenue sur DiDi Sphere !
          </h1>
          <p className="text-gray-500 mb-2">
            Le compte <span className="font-semibold text-gray-800">{success.name}</span> a bien été créé.
          </p>
          <p className="text-gray-500 mb-8">
            Votre essai gratuit de <span className="font-semibold text-ds-green">{success.trialDays} jours</span> commence maintenant.
            Un email de bienvenue vous a été envoyé.
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
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-10">
          <img src="/logo_mode_claire.svg" alt="DiDi Sphere" className="h-9 mx-auto mb-6" />
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Créer votre compte</h1>
          <p className="text-gray-500 text-sm">
            Essai gratuit de 21 jours · Aucune carte bancaire requise
          </p>
        </div>

        {/* Erreur globale */}
        {mutation.isError && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            {getApiErrorMessage(mutation.error)}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8">

          {/* Boutique */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nom de votre boutique / entreprise <span className="text-red-500">*</span>
            </label>
            <input
              {...register('company_name')}
              type="text"
              placeholder="Ex : Boutique Fatou, Boulangerie Dakar…"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 outline-none transition"
            />
            {errors.company_name && <p className="mt-1 text-xs text-red-500">{errors.company_name.message}</p>}
          </div>

          {/* Secteur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Secteur d'activité <span className="text-red-500">*</span>
            </label>
            <select
              {...register('sector')}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 outline-none transition bg-white dark:bg-gray-800"
            >
              {SECTORS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {errors.sector && <p className="mt-1 text-xs text-red-500">{errors.sector.message}</p>}
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
                        value         : field.value ?? '',
                        onChange      : field.onChange,
                        placeholder   : 'Saisir le numéro de téléphone',
                        name          : 'phone',
                        autoComplete  : 'off',
                      }}
                    />
                  )}
                />
              )}
            />
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Votre compte administrateur</p>

            {/* Nom admin */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Votre nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('admin_name')}
                  type="text"
                  placeholder="Prénom Nom"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 outline-none transition"
                />
                {errors.admin_name && <p className="mt-1 text-xs text-red-500">{errors.admin_name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Adresse email <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('admin_email')}
                  type="email"
                  placeholder="vous@exemple.com"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 outline-none transition"
                />
                {errors.admin_email && <p className="mt-1 text-xs text-red-500">{errors.admin_email.message}</p>}
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register('admin_password')}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="8 caractères minimum"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {errors.admin_password && <p className="mt-1 text-xs text-red-500">{errors.admin_password.message}</p>}
              </div>

              {/* Confirmation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('confirm')}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Répétez le mot de passe"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 outline-none transition"
                />
                {errors.confirm && <p className="mt-1 text-xs text-red-500">{errors.confirm.message}</p>}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-xl bg-ds-blue py-3.5 text-sm font-bold text-white hover:bg-ds-blue-dark disabled:opacity-60 transition-all shadow-lg shadow-ds-blue/20"
          >
            {mutation.isPending ? 'Création en cours…' : 'Créer mon compte gratuit →'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-semibold text-ds-blue hover:underline">
            Se connecter
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-gray-400">
          En créant un compte vous acceptez nos{' '}
          <Link to="/contact" className="underline hover:text-gray-600">CGU</Link>
          {' '}et notre{' '}
          <Link to="/contact" className="underline hover:text-gray-600">politique de confidentialité</Link>.
        </p>

      </div>
    </div>
  )
}
