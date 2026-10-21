import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import {
  UsersIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  BuildingStorefrontIcon,
  PhotoIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon as EnvelopeSmtpIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline'
import { CreditCardIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { formatDate } from '@/lib/utils'
import { getPublicPlans } from '@/services/api/public'
import { initiateRenewal, getBillingTransactions } from '@/services/api/billing'
import type { BillingTransaction } from '@/services/api/billing'
import { getTenantSettings, updateTenantSettings } from '@/services/api/settings'
import { SUPPORTED_CURRENCIES } from '@/hooks/useCurrency'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import PhoneInput, { normalizePhone } from '@/components/ui/PhoneInput'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  syncUserGroups,
} from '@/services/api/users'
import {
  getGroups,
  getAvailablePermissions,
  createGroup,
  updateGroup,
  deleteGroup,
  syncGroupPermissions,
} from '@/services/api/groups'
import type { UserWithGroups, Group, Permission, CreateGroupData } from '@/types'

// ─── Tab IDs ──────────────────────────────────────────────────────────────────

type Tab = 'boutique' | 'vente' | 'facturation' | 'email' | 'users' | 'groups'

// ─── Schemas ─────────────────────────────────────────────────────────────────

// Création : pas de mot de passe — généré par le backend
const userCreateSchema = z.object({
  name:      z.string().min(2, 'Nom requis'),
  email:     z.string().email('Email invalide'),
  is_active: z.boolean().optional(),
})

// Édition : mot de passe optionnel + confirmation conditionnelle
const userEditSchema = z.object({
  name:                  z.string().min(2, 'Nom requis'),
  email:                 z.string().email('Email invalide'),
  password:              z.string().min(8, '8 caractères min').or(z.literal('')).optional(),
  password_confirmation: z.string().optional(),
  is_active:             z.boolean().optional(),
}).refine((d) => {
  if (!d.password) return true        // pas de mdp saisi → pas de validation
  return d.password === d.password_confirmation
}, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirmation'],
})

type UserCreateValues = z.infer<typeof userCreateSchema>
type UserEditValues   = z.infer<typeof userEditSchema>
type UserValues = UserCreateValues | UserEditValues

const groupSchema = z.object({
  name:        z.string().min(2, 'Nom requis'),
  description: z.string().nullable().optional(),
})
type GroupValues = z.infer<typeof groupSchema>

// ─── SmtpSection ─────────────────────────────────────────────────────────────

const smtpSchema = z.object({
  smtp_host:         z.string().max(255).optional(),
  smtp_port:         z.string().regex(/^\d*$/, 'Port invalide').optional(),
  smtp_encryption:   z.enum(['tls', 'ssl']).default('tls'),
  smtp_username:     z.string().max(255).optional(),
  smtp_password:     z.string().max(255).optional(),
  smtp_from_address: z.string().email('Email invalide').or(z.literal('')).optional(),
  smtp_from_name:    z.string().max(255).optional(),
})
type SmtpValues = z.infer<typeof smtpSchema>

function SmtpSection() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [saved, setSaved]               = useState(false)

  const { data } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn:  getTenantSettings,
  })

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SmtpValues>({
    resolver: zodResolver(smtpSchema),
    defaultValues: { smtp_encryption: 'tls' },
  })

  useEffect(() => {
    if (data) {
      reset({
        smtp_host:         data.smtp_host         ?? '',
        smtp_port:         data.smtp_port         ? String(data.smtp_port) : '',
        smtp_encryption:   (['tls', 'ssl'] as const).includes(data.smtp_encryption as 'tls' | 'ssl') ? (data.smtp_encryption as 'tls' | 'ssl') : 'tls',
        smtp_username:     data.smtp_username     ?? '',
        smtp_password:     data.smtp_password     ?? '',
        smtp_from_address: data.smtp_from_address ?? '',
        smtp_from_name:    data.smtp_from_name    ?? '',
      })
    }
  }, [data, reset])

  const mutation = useMutation({
    mutationFn: (vals: SmtpValues) => updateTenantSettings({
      smtp_host:         vals.smtp_host         || null,
      smtp_port:         vals.smtp_port         ? Number(vals.smtp_port) : null,
      smtp_encryption:   vals.smtp_encryption,
      smtp_username:     vals.smtp_username     || null,
      smtp_password:     vals.smtp_password     || null,
      smtp_from_address: vals.smtp_from_address || null,
      smtp_from_name:    vals.smtp_from_name    || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success(t('settings.smtp_saved_toast'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const EMPTY_SMTP: SmtpValues = { smtp_host: '', smtp_port: '', smtp_encryption: 'tls', smtp_username: '', smtp_password: '', smtp_from_address: '', smtp_from_name: '' }

  const clearSmtp = () => {
    mutation.mutate(EMPTY_SMTP, { onSuccess: () => reset(EMPTY_SMTP) })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('settings.smtp_title')}</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t('settings.smtp_desc')}</p>
      </div>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={t('settings.smtp_host')} placeholder="smtp.hostinger.com" {...register('smtp_host')} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input label={t('settings.smtp_port')} type="number" placeholder="587" {...register('smtp_port')} />
            </div>
            <div>
              <label htmlFor="smtp-enc" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.smtp_encryption')}</label>
              <Select id="smtp-enc" {...register('smtp_encryption')}>
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
              </Select>
            </div>
          </div>
          <Input label={t('settings.smtp_username')} placeholder="contact@ma-boutique.sn" {...register('smtp_username')} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.smtp_password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-label={t('settings.smtp_password')}
                {...register('smtp_password')}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 pr-9 text-sm outline-none focus:border-brand-primary transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('settings.smtp_hide_password') : t('settings.smtp_show_password')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Input
            label={t('settings.smtp_from_address')}
            type="email"
            placeholder="contact@ma-boutique.sn"
            error={errors.smtp_from_address?.message}
            {...register('smtp_from_address')}
          />
          <Input label={t('settings.smtp_from_name')} placeholder="Ma Boutique Dakar" {...register('smtp_from_name')} />
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
            {t('common.save')}
          </Button>
          {data?.smtp_host && (
            <button
              type="button"
              onClick={clearSmtp}
              className="text-xs text-red-500 hover:underline"
            >
              {t('settings.smtp_delete')}
            </button>
          )}
          {saved && <span className="text-sm text-emerald-600 font-medium">{t('settings.smtp_saved')}</span>}
        </div>
      </form>
    </div>
  )
}

// PdfTemplateSection supprimée — le sélecteur est désormais dans l'onglet Facturation

// ─── BoutiqueTab ─────────────────────────────────────────────────────────────

const boutiqueSchema = z.object({
  name:                 z.string().min(2, 'Nom requis'),
  sector:               z.enum(['general', 'food', 'fashion', 'cosmetic', 'pharmacy', 'electronics', 'services', 'ecommerce']),
  timezone:             z.string().default('Africa/Dakar'),
  country:              z.string().length(2).default('SN'),
  phone_country:        z.string().length(2).default('SN'),
  phone:                z.string().optional(),
  email:                z.string().email('Email invalide').or(z.literal('')).optional(),
  address:              z.string().optional(),
  city:                 z.string().optional(),
  rccm:                 z.string().optional(),
  ninea:                z.string().optional(),
  business_description: z.string().max(500).optional(),
})
type BoutiqueValues = z.infer<typeof boutiqueSchema>

const SECTOR_LABELS: Record<string, string> = {
  general:     'Commerce général',
  food:        'Alimentation / Restauration',
  fashion:     'Mode / Vêtements',
  cosmetic:    'Beauté / Cosmétique',
  pharmacy:    'Pharmacie / Parapharmacie',
  electronics: 'High-tech / Électronique',
  services:    'Prestations de services',
  ecommerce:   'E-commerce',
}

const TIMEZONE_OPTIONS = [
  'Africa/Dakar', 'Africa/Abidjan', 'Africa/Bamako', 'Africa/Conakry',
  'Africa/Lagos', 'Africa/Accra', 'Africa/Casablanca', 'Africa/Tunis',
  'Europe/Paris', 'Europe/London',
]

const COUNTRY_OPTIONS = [
  { code: 'SN', label: 'Sénégal' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'ML', label: 'Mali' },
  { code: 'GN', label: 'Guinée' },
  { code: 'BF', label: 'Burkina Faso' },
  { code: 'TG', label: 'Togo' },
  { code: 'BJ', label: 'Bénin' },
  { code: 'GH', label: 'Ghana' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'CM', label: 'Cameroun' },
  { code: 'MA', label: 'Maroc' },
  { code: 'FR', label: 'France' },
]

function BoutiqueTab() {
  const { t } = useTranslation()
  const setAuth             = useAuthStore((s) => s.setAuth)
  const token               = useAuthStore((s) => s.token)
  const user                = useAuthStore((s) => s.user)
  const perms               = useAuthStore((s) => s.permissions)
  const tenant              = useAuthStore((s) => s.tenant)
  const subscription        = useAuthStore((s) => s.subscription)
  const planFeatures        = useAuthStore((s) => s.planFeatures)
  const subscriptionExpired = useAuthStore((s) => s.subscriptionExpired)
  const [saved, setSaved] = useState(false)

  const [logoFile, setLogoFile]       = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo]   = useState(false)
  const [logoError, setLogoError]     = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn:  getTenantSettings,
    enabled:  !subscriptionExpired,
    retry:    false,
  })

  const { register, handleSubmit, reset, control, formState: { errors, isDirty } } = useForm<BoutiqueValues>({
    resolver: zodResolver(boutiqueSchema),
    defaultValues: { phone_country: 'SN' },
  })

  useEffect(() => {
    if (data) {
      reset({
        name:                 data.name,
        sector:               data.sector as BoutiqueValues['sector'],
        timezone:             data.timezone ?? 'Africa/Dakar',
        country:              data.country  ?? 'SN',
        phone_country:        'SN',
        phone:                data.phone ?? '',
        email:                data.email ?? '',
        address:              data.address ?? '',
        city:                 data.city ?? '',
        rccm:                 data.rccm ?? '',
        ninea:                data.ninea ?? '',
        business_description: data.business_description ?? '',
      })
      setLogoPreview(data.logo_url ?? null)
    }
  }, [data, reset])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!ACCEPTED.includes(file.type)) {
      setLogoError(t('settings.logo_invalid_format'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError(t('settings.logo_too_large'))
      return
    }
    setLogoError(null)
    setLogoFile(file)
    setRemoveLogo(false)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleLogoRemove = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setLogoError(null)
    setRemoveLogo(true)
  }

  const mutation = useMutation({
    mutationFn: (vals: BoutiqueValues) => updateTenantSettings(
      {
        name:                 vals.name,
        sector:               vals.sector,
        timezone:             vals.timezone,
        country:              vals.country,
        phone:                normalizePhone(vals.phone),
        email:                vals.email || null,
        address:              vals.address || null,
        city:                 vals.city || null,
        rccm:                 vals.rccm || null,
        ninea:                vals.ninea || null,
        business_description: vals.business_description || null,
      },
      logoFile,
      removeLogo,
    ),
    onSuccess: (updated) => {
      if (token && user) {
        setAuth(token, user, perms, {
          api_key:         tenant?.api_key ?? '',
          name:            updated.name,
          currency:        updated.currency,
          sector:          updated.sector,
          rccm:            updated.rccm ?? null,
          ninea:           updated.ninea ?? null,
          primary_color:   updated.primary_color,
          secondary_color: updated.secondary_color,
          logo_url:        updated.logo_url ?? null,
          slug:            tenant?.slug ?? '',
          locale:          tenant?.locale ?? 'fr',
          timezone:        updated.timezone ?? tenant?.timezone ?? 'Africa/Dakar',
        }, subscription, planFeatures)
      }
      setLogoFile(null)
      setRemoveLogo(false)
      setLogoPreview(updated.logo_url ?? null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success(t('settings.saved_shop'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  if (subscriptionExpired) return <SubscriptionLockedNotice />
  if (isLoading) return <div className="text-sm text-gray-400">{t('settings.loading')}</div>
  if (isError) return <div className="rounded-xl bg-red-50 px-4 py-6 text-center text-sm text-red-600">{t('settings.load_error')}</div>

  return (
    <div className="space-y-8">
    <form onSubmit={handleSubmit((v) => { if (!logoError) mutation.mutate(v) })} className="space-y-6">
      {/* Logo */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.shop_logo')}</p>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="relative">
              <img
                src={logoPreview}
                alt="Logo"
                className="h-20 w-20 rounded-xl object-contain ring-1 ring-gray-200 dark:ring-gray-600 bg-gray-50 dark:bg-gray-700 p-1"
              />
              <button
                type="button"
                onClick={handleLogoRemove}
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                aria-label={t('common.delete') + ' logo'}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-brand-primary hover:text-brand-primary transition"
            >
              <PhotoIcon className="h-7 w-7" />
              <span className="text-xs font-medium">Logo</span>
            </button>
          )}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="text-sm font-medium text-brand-primary hover:underline"
            >
              {logoPreview ? t('settings.change_logo') : t('settings.add_logo')}
            </button>
            <p className="text-xs text-gray-400">{t('settings.logo_format')}</p>
            {logoError && <p className="text-xs text-red-500">{logoError}</p>}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoChange}
            aria-label={t('settings.add_logo')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={t('settings.shop_name')} error={errors.name?.message} {...register('name')} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.sector')}</label>
          <Select {...register('sector')}>
            {Object.entries(SECTOR_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.timezone')}</label>
          <Select {...register('timezone')}>
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.country')}</label>
          <Select {...register('country')}>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>{c.label} ({c.code})</option>
            ))}
          </Select>
        </div>
      </div>

      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <Controller
            name="phone_country"
            control={control}
            render={({ field: countryField }) => (
              <PhoneInput
                label={t('common.phone')}
                country={countryField.value}
                onCountryChange={countryField.onChange}
                phoneProps={{
                  value: field.value ?? '',
                  onChange: field.onChange,
                  onBlur: field.onBlur,
                  name: field.name,
                }}
                error={errors.phone?.message}
              />
            )}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={t('common.email')} type="email" {...register('email')} />
        <Input label={t('common.address')} {...register('address')} />
        <Input label={t('common.city')} {...register('city')} />
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.legal_info')} <span className="text-xs font-normal text-gray-400 dark:text-gray-500">{t('settings.legal_info_hint')}</span></p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="RCCM"
            placeholder="SN-DKR-2024-B-12345"
            hint={t('settings.rccm_hint')}
            {...register('rccm')}
          />
          <Input
            label="NINEA"
            placeholder="012345678"
            hint={t('settings.ninea_hint')}
            {...register('ninea')}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('settings.business_desc')}
          <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">({t('common.optional').toLowerCase()})</span>
        </label>
        <textarea
          rows={3}
          maxLength={500}
          placeholder={t('settings.business_desc_placeholder')}
          className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
          {...register('business_description')}
        />
        <p className="mt-1 text-xs text-gray-400">{t('settings.business_desc_hint')}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
          {t('common.save')}
        </Button>
        {saved && <span className="text-sm text-emerald-600 font-medium">{t('settings.saved_ok')}</span>}
      </div>
    </form>
    </div>
  )
}

// ─── UserModal ────────────────────────────────────────────────────────────────

interface UserModalProps {
  isOpen:  boolean
  editing: UserWithGroups | null
  groups:  Group[]
  onClose: () => void
}

function UserModal({ isOpen, editing, groups, onClose }: UserModalProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])
  const [apiError, setApiError]           = useState<string | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [copied, setCopied]               = useState(false)
  const [showPassword, setShowPassword]   = useState(false)

  const schema = editing ? userEditSchema : userCreateSchema

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserCreateValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!isOpen) return
    reset({ name: editing?.name ?? '', email: editing?.email ?? '', password: '', password_confirmation: '', is_active: editing?.is_active ?? true })
    setSelectedGroupIds(editing?.groups?.map((g) => g.id) ?? [])
    setApiError(null)
    setGeneratedPassword(null)
    setCopied(false)
    setShowPassword(false)
  }, [isOpen, editing, reset])

  const mutation = useMutation({
    mutationFn: async (vals: UserValues) => {
      if (editing) {
        const body: Record<string, unknown> = { name: vals.name, email: vals.email, is_active: vals.is_active }
        if ('password' in vals && vals.password) body.password = (vals as UserEditValues).password
        const u = await updateUser(editing.uid, body)
        await syncUserGroups(u.uid, selectedGroupIds)
        return u
      }
      return createUser({
        name:      vals.name,
        email:     vals.email,
        is_active: vals.is_active ?? true,
        group_ids: selectedGroupIds,
      })
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      if (!editing && 'generated_password' in result) {
        // Affiche le mot de passe généré — ne pas fermer la modal tout de suite
        setGeneratedPassword(result.generated_password)
      } else {
        toast.success(editing ? t('settings.user_updated') : t('settings.user_created'))
        onClose()
      }
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setApiError(msg ?? t('settings.save_error'))
    },
  })

  const handleCopy = () => {
    if (!generatedPassword) return
    navigator.clipboard.writeText(generatedPassword).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleClose = () => {
    if (generatedPassword) {
      toast.success(t('settings.user_created'))
    }
    onClose()
  }

  const toggleGroup = (id: number) =>
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  // ── Vue "mot de passe généré" ─────────────────────────────────────────────
  if (generatedPassword) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('settings.user_created_title')}
        footer={
          <Button className="w-full" onClick={handleClose}>{t('common.close')}</Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.user_created_info')}</p>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-xs font-medium text-indigo-500 mb-1">{t('settings.field_password')}</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 font-mono text-lg font-bold tracking-widest text-indigo-700 select-all">
                {generatedPassword}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
              >
                {copied ? t('common.copied') : t('common.copy')}
              </button>
            </div>
          </div>

          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t('settings.user_password_once')}
          </p>
        </div>
      </Modal>
    )
  }

  // ── Vue formulaire ────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? t('settings.user_modal_edit') : t('settings.user_modal_create')}
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="user-form" className="flex-1" loading={mutation.isPending}>
            {editing ? t('common.save') : t('common.create')}
          </Button>
        </div>
      }
    >
      <form id="user-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.field_name_required')}</label>
          <input {...register('name')} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition" />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.field_email_required')}</label>
          <input type="email" {...register('email')} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition" />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        {editing && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.field_password')}
                <span className="font-normal text-gray-400 dark:text-gray-500 ml-1">{t('settings.field_password_note')}</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password' as keyof UserCreateValues)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 pr-10 text-sm outline-none focus:border-indigo-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                >
                  {showPassword
                    ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
              {'password' in errors && errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.field_password_confirm')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password_confirmation' as keyof UserCreateValues)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 pr-10 text-sm outline-none focus:border-indigo-400 transition"
                />
              </div>
              {'password_confirmation' in errors && errors.password_confirmation && (
                <p className="mt-1 text-xs text-red-500">{errors.password_confirmation.message}</p>
              )}
            </div>
          </>
        )}

        {!editing && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-blue-700">
            {t('settings.user_password_auto')}
          </div>
        )}

        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active_u" {...register('is_active')} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
          <label htmlFor="is_active_u" className="text-sm text-gray-700 dark:text-gray-300">{t('settings.field_active')}</label>
        </div>

        {groups.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.col_groups')}</label>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const active = selectedGroupIds.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      active ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {g.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {apiError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {apiError}
          </div>
        )}
      </form>
    </Modal>
  )
}

// ─── UsersTab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const me = useAuthStore((s) => s.user)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState<UserWithGroups | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserWithGroups | null>(null)

  const { data: page, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: getGroups,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success(t('settings.user_deleted')) },
    onError: (err) => toast.error(getApiErrorMessage(err)),
    onSettled: () => setDeletingId(null),
  })

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit   = (u: UserWithGroups) => { setEditing(u); setModalOpen(true) }

  const users = page?.data ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">{t('settings.users_title')}</h2>
        <Button size="sm" icon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>
          {t('settings.new_user')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">{t('settings.col_name')}</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">{t('settings.col_email')}</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">{t('settings.col_groups')}</th>
                <th className="px-4 py-3 text-left">{t('settings.col_status')}</th>
                <th className="px-4 py-3 sr-only">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                    {u.name}
                    {u.id === me?.id && <span className="ml-2 text-xs text-indigo-500">{t('settings.you')}</span>}
                    <p className="text-xs text-gray-400 dark:text-gray-500 sm:hidden">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(u.groups ?? []).map((g) => (
                        <Badge key={g.id} variant="info" size="sm">{g.name}</Badge>
                      ))}
                      {(u.groups ?? []).length === 0 && <span className="text-xs text-gray-400">{t('settings.no_groups')}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.is_active ? 'success' : 'default'} dot>
                      {u.is_active ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 transition"
                        title={t('common.edit')}
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      {u.id !== me?.id && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(u)}
                          disabled={deletingId === u.uid}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition disabled:opacity-40"
                          title={t('common.delete')}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserModal
        isOpen={modalOpen}
        editing={editing}
        groups={groups}
        onClose={() => setModalOpen(false)}
      />

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('settings.delete_user_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return
                setDeletingId(deleteTarget.uid)
                deleteMutation.mutate(deleteTarget.uid)
                setDeleteTarget(null)
              }}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('settings.delete_user_confirm')}{' '}
          <span className="font-semibold text-gray-900 dark:text-gray-100">«{deleteTarget?.name}»</span> ?
          {' '}{t('common.action_irreversible')}
        </p>
      </Modal>
    </div>
  )
}

// ─── PermissionsModal ─────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  dashboard:  'Tableau de bord',
  products:   'Produits',
  categories: 'Catégories',
  variants:   'Variantes',
  stock:      'Stock',
  pos:        'Point de vente',
  sales:      'Ventes',
  returns:    'Retours',
  customers:  'Clients',
  debts:      'Créances',
  suppliers:  'Fournisseurs',
  purchases:  'Achats',
  invoices:   'Facturation',
  reports:    'Rapports',
  users:      'Utilisateurs',
  groups:     'Groupes',
  settings:   'Paramètres',
  shop:       'Boutique en ligne',
}

interface PermissionsModalProps {
  group:   Group | null
  isOpen:  boolean
  onClose: () => void
}

function PermissionsModal({ group, isOpen, onClose }: PermissionsModalProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [checked, setChecked] = useState<number[]>([])

  const { data: byModule = {} } = useQuery({
    queryKey: ['permissions-available'],
    queryFn: getAvailablePermissions,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (isOpen && group) {
      setChecked(group.permissions?.map((p) => p.id) ?? [])
    }
  }, [isOpen, group])

  const mutation = useMutation({
    mutationFn: () => syncGroupPermissions(group!.uid, checked),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      toast.success(t('groups.permissions') + ' ' + t('settings.save_success').toLowerCase())
      onClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const toggle = (id: number) =>
    setChecked((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const toggleModule = (perms: Permission[]) => {
    const ids = perms.map((p) => p.id)
    const allOn = ids.every((id) => checked.includes(id))
    setChecked((prev) =>
      allOn ? prev.filter((x) => !ids.includes(x)) : [...new Set([...prev, ...ids])],
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Permissions — ${group?.name ?? ''}`}
      size="lg"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className="flex-1" loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {Object.entries(byModule).map(([module, perms]) => {
          const ids = (perms as Permission[]).map((p) => p.id)
          const checkedCount = ids.filter((id) => checked.includes(id)).length

          return (
            <div key={module} className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleModule(perms as Permission[])}
                className="flex w-full items-center justify-between bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {MODULE_LABELS[module] ?? module}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{checkedCount}/{ids.length}</span>
              </button>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3">
                {(perms as Permission[]).map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked.includes(p.id)}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{p.display_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

// ─── GroupModal ───────────────────────────────────────────────────────────────

interface GroupModalProps {
  isOpen:  boolean
  editing: Group | null
  onClose: () => void
}

function GroupModal({ isOpen, editing, onClose }: GroupModalProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [apiError, setApiError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GroupValues>({
    resolver: zodResolver(groupSchema),
  })

  useEffect(() => {
    if (!isOpen) return
    reset({ name: editing?.name ?? '', description: editing?.description ?? '' })
    setApiError(null)
  }, [isOpen, editing, reset])

  const mutation = useMutation({
    mutationFn: (vals: GroupValues) =>
      editing
        ? updateGroup(editing.uid, vals as Partial<CreateGroupData>)
        : createGroup(vals as CreateGroupData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      toast.success(editing ? t('settings.group_updated') : t('settings.group_created'))
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setApiError(msg ?? t('settings.save_error'))
    },
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? t('settings.group_modal_edit') : t('settings.group_modal_create')}
      size="sm"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="group-form" className="flex-1" loading={mutation.isPending}>
            {editing ? t('common.save') : t('common.create')}
          </Button>
        </div>
      }
    >
      <form id="group-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.field_name_required')}</label>
          <input {...register('name')} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition" />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('settings.field_description')} <span className="font-normal text-gray-400 dark:text-gray-500">({t('common.optional').toLowerCase()})</span>
          </label>
          <textarea {...register('description')} rows={2} className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition" />
        </div>

        {apiError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {apiError}
          </div>
        )}
      </form>
    </Modal>
  )
}

// ─── GroupsTab ────────────────────────────────────────────────────────────────

function GroupsTab() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [groupModalOpen, setGroupModalOpen]   = useState(false)
  const [editing, setEditing]                 = useState<Group | null>(null)
  const [permGroup, setPermGroup]             = useState<Group | null>(null)
  const [permModalOpen, setPermModalOpen]     = useState(false)
  const [deletingId, setDeletingId]           = useState<string | null>(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<Group | null>(null)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: getGroups,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); toast.success(t('settings.group_deleted')) },
    onError: (err) => toast.error(getApiErrorMessage(err)),
    onSettled: () => setDeletingId(null),
  })

  const openCreate = () => { setEditing(null); setGroupModalOpen(true) }
  const openEdit   = (g: Group) => { setEditing(g); setGroupModalOpen(true) }
  const openPerms  = (g: Group) => { setPermGroup(g); setPermModalOpen(true) }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">{t('settings.groups_title')}</h2>
        <Button size="sm" icon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>
          {t('settings.new_group')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-700/40 px-4 py-3 shadow-sm">
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">{g.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>{g.users_count ?? 0} {(g.users_count ?? 0) > 1 ? t('settings.user_plural') : t('settings.user_singular')}</span>
                  <span>·</span>
                  <span>{g.permissions?.length ?? 0} {(g.permissions?.length ?? 0) > 1 ? t('settings.perm_plural') : t('settings.perm_singular')}</span>
                  {g.description && <><span>·</span><span className="italic">{g.description}</span></>}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => openPerms(g)}
                  className="rounded px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                >
                  {t('settings.permissions_btn')}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(g)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 transition"
                  title={t('settings.rename')}
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteGroupTarget(g)}
                  disabled={deletingId === g.uid}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition disabled:opacity-40"
                  title={t('common.delete')}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <GroupModal isOpen={groupModalOpen} editing={editing} onClose={() => setGroupModalOpen(false)} />
      <PermissionsModal isOpen={permModalOpen} group={permGroup} onClose={() => setPermModalOpen(false)} />

      <Modal
        isOpen={!!deleteGroupTarget}
        onClose={() => setDeleteGroupTarget(null)}
        title={t('settings.delete_group_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteGroupTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (!deleteGroupTarget) return
                setDeletingId(deleteGroupTarget.uid)
                deleteMutation.mutate(deleteGroupTarget.uid)
                setDeleteGroupTarget(null)
              }}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('settings.delete_group_confirm')}{' '}
          <span className="font-semibold text-gray-900 dark:text-gray-100">«{deleteGroupTarget?.name}»</span> ?
          {' '}{t('settings.delete_group_effect')}
        </p>
      </Modal>
    </div>
  )
}

// ─── SubscriptionLockedNotice ─────────────────────────────────────────────────

function SubscriptionLockedNotice() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center space-y-3">
      <div className="rounded-full bg-amber-50 p-4">
        <CreditCardIcon className="h-7 w-7 text-amber-500" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.locked_title')}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
        {t('settings.locked_desc')}
      </p>
    </div>
  )
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  trial:     'bg-blue-100 text-blue-700',
  active:    'bg-emerald-100 text-emerald-700',
  expired:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

function SubscriptionInfoCard() {
  const { t } = useTranslation()
  const subscription        = useAuthStore((s) => s.subscription)
  const subscriptionExpired = useAuthStore((s) => s.subscriptionExpired)

  const STATUS_LABEL: Record<string, string> = {
    trial:     t('settings.status_trial'),
    active:    t('settings.status_active'),
    expired:   t('settings.status_expired'),
    cancelled: t('settings.status_cancelled'),
  }
  const CYCLE_LABEL: Record<string, string> = {
    trial:    t('settings.cycle_trial'),
    monthly:  t('settings.cycle_monthly'),
    yearly:   t('settings.cycle_yearly'),
    lifetime: t('settings.cycle_lifetime'),
  }
  const [searchParams, setSearchParams] = useSearchParams()

  const daysLeft       = subscription?.days_remaining ?? null
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7
  const isExpired      = subscriptionExpired
    || subscription?.status === 'expired'
    || subscription?.status === 'cancelled'
  const [showPlanModal, setShowPlanModal] = useState(
    () => searchParams.get('renouveler') === '1' || isExpired,
  )
  const [selectedPlan,  setSelectedPlan]  = useState<string>('')
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly')

  // Nettoie le param ?renouveler=1 de l'URL une fois le modal ouvert
  useEffect(() => {
    if (searchParams.get('renouveler') === '1') {
      setSearchParams((p) => { p.delete('renouveler'); return p }, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-ouvrir le modal dès que l'abonnement expire
  useEffect(() => {
    if (isExpired) setShowPlanModal(true)
  }, [isExpired])

  const { data: plans = [] } = useQuery({
    queryKey: ['public-plans'],
    queryFn : getPublicPlans,
    staleTime: 5 * 60 * 1000,
  })

  // Pré-sélectionner le plan actuel quand les plans sont chargés
  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      const match = subscription?.plan_slug
        ? plans.find((p) => p.slug === subscription.plan_slug)
        : null
      setSelectedPlan(match ? match.uid : plans[0].uid)
    }
  }, [plans]) // eslint-disable-line react-hooks/exhaustive-deps

  const renewMutation = useMutation({
    mutationFn: () => initiateRenewal(selectedPlan, selectedCycle),
    onSuccess : ({ checkout_url }) => { window.location.href = checkout_url },
    onError   : (err) => toast.error(getApiErrorMessage(err)),
  })

  // Afficher la carte même si subscription=null dès qu'un 402 a été reçu
  if (!subscription && !subscriptionExpired) return null

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-4 sm:p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CreditCardIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('settings.my_subscription')}</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowPlanModal(true)}
          className="text-xs font-semibold text-brand-primary hover:underline"
        >
          {isExpired ? t('settings.renew') : t('settings.manage_subscription')}
        </button>
      </div>

      {subscription ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {subscription.plan_name ?? '—'}
          </span>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLOR[subscription.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_LABEL[subscription.status] ?? subscription.status}
          </span>
          <span className="text-xs text-gray-400">
            {CYCLE_LABEL[subscription.billing_cycle]}
          </span>
        </div>
      ) : (
        <p className="text-sm text-red-600 font-medium">{t('settings.expired_sub')}</p>
      )}

      {subscription?.ends_at && (
        <p className={`mt-2 text-xs ${isExpiringSoon ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
          {subscription.status === 'trial' ? t('settings.trial_until') : t('settings.valid_until')}{' '}
          <span className="font-semibold">{formatDate(subscription!.ends_at!)}</span>
          {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && (
            <span className="ml-1">
              ({daysLeft === 0 ? t('settings.expires_today') : daysLeft === 1 ? t('settings.days_left_1') : t('settings.days_left', { n: daysLeft })})
            </span>
          )}
        </p>
      )}

      <Modal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title={t('settings.change_plan_title')}
        size="xl"
      >
        <div className="space-y-6 pb-2">

          {/* Toggle mensuel / annuel */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 p-1">
              {(['monthly', 'yearly'] as const).map((c) => {
                const discountPct = plans.find(p => p.yearly_discount_pct)?.yearly_discount_pct
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCycle(c)}
                    className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                      selectedCycle === c
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {c === 'monthly' ? t('settings.cycle_monthly') : t('settings.cycle_yearly')}
                    {c === 'yearly' && discountPct && (
                      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                        -{discountPct}%
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Grille de plans */}
          <div className={`grid gap-4 ${plans.length === 2 ? 'grid-cols-2' : plans.length >= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
            {plans.map((p) => {
              const monthlyPrice   = parseInt(p.price_monthly)
              const yearlyPrice    = p.price_yearly ? Math.round(parseInt(p.price_yearly) / 12) : null
              const displayPrice   = selectedCycle === 'yearly' && yearlyPrice ? yearlyPrice : monthlyPrice
              const isSelected     = selectedPlan === p.uid
              const isCurrentPlan  = subscription?.plan_slug === p.slug
              const isPopular      = !!p.badge

              return (
                <button
                  key={p.uid}
                  type="button"
                  onClick={() => setSelectedPlan(p.uid)}
                  className={`relative flex flex-col rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 hover:border-brand-primary/50 hover:shadow-sm'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-primary px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                      {p.badge}
                    </span>
                  )}

                  {/* Nom + tagline */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-bold ${isSelected ? 'text-brand-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                        {p.name}
                      </p>
                      {isCurrentPlan && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {t('settings.current_plan')}
                        </span>
                      )}
                    </div>
                    {p.tagline && (
                      <p className="mt-0.5 text-xs text-gray-500">{p.tagline}</p>
                    )}
                  </div>

                  {/* Prix */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-extrabold ${isSelected ? 'text-brand-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                        {displayPrice.toLocaleString('fr-FR')}
                      </span>
                      <span className="text-xs text-gray-400">XOF/mois</span>
                    </div>
                    {selectedCycle === 'yearly' && yearlyPrice && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        soit {parseInt(p.price_yearly!).toLocaleString('fr-FR')} XOF/an
                      </p>
                    )}
                  </div>

                  {/* Limites */}
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>{p.max_users === 0 ? '∞' : p.max_users} utilisateur{p.max_users !== 1 ? 's' : ''}</p>
                    <p>{p.max_products === 0 ? '∞' : p.max_products.toLocaleString('fr-FR')} produits</p>
                  </div>

                  {/* Features principales */}
                  {p.features && p.features.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {p.features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                          <svg className="h-3 w-3 shrink-0 text-emerald-500" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Coche sélection */}
                  {isSelected && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white">
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => renewMutation.mutate()}
              disabled={!selectedPlan || renewMutation.isPending}
              className="w-full rounded-xl bg-brand-primary py-3 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {renewMutation.isPending
                ? t('settings.redirecting_payment')
                : selectedPlan
                  ? (selectedCycle === 'yearly' ? t('settings.pay_yearly') : t('settings.pay_monthly'))
                  : t('settings.select_plan')}
            </button>
            <button
              type="button"
              onClick={() => setShowPlanModal(false)}
              className="w-full rounded-xl py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            {t('settings.secure_payment')}
          </p>
        </div>
      </Modal>
    </div>
  )
}

// ─── FacturationTab ──────────────────────────────────────────────────────────

const facturationSchema = z.object({
  invoice_footer: z.string().max(500).optional(),
  invoice_prefix: z.string().max(10).optional(),
  pdf_template:   z.enum(['classic', 'moderne']).optional(),
})
type FacturationValues = z.infer<typeof facturationSchema>

function InvoiceHistory() {
  const { t } = useTranslation()
  const TX_STATUS: Record<string, { label: string; className: string }> = {
    completed: { label: t('settings.tx_paid'),      className: 'bg-emerald-100 text-emerald-700' },
    pending:   { label: t('settings.tx_pending'),   className: 'bg-amber-100 text-amber-700' },
    failed:    { label: t('settings.tx_failed'),    className: 'bg-red-100 text-red-700' },
    cancelled: { label: t('settings.tx_cancelled'), className: 'bg-gray-100 text-gray-500' },
  }

  const { data, isLoading } = useQuery({
    queryKey: ['billing-transactions'],
    queryFn:  getBillingTransactions,
    staleTime: 2 * 60 * 1000,
  })

  const transactions: BillingTransaction[] = data?.data ?? []

  if (!isLoading && transactions.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('settings.payment_history')}</h3>
      <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2.5 text-left">{t('settings.tx_date')}</th>
              <th className="px-4 py-2.5 text-left hidden sm:table-cell">{t('settings.tx_plan')}</th>
              <th className="px-4 py-2.5 text-left hidden sm:table-cell">{t('settings.tx_cycle')}</th>
              <th className="px-4 py-2.5 text-right">{t('settings.tx_amount')}</th>
              <th className="px-4 py-2.5 text-center">{t('settings.tx_status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-gray-100 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
              : transactions.map((tx) => {
                const statusCfg = TX_STATUS[tx.status] ?? { label: tx.status, className: 'bg-gray-100 text-gray-500' }
                const cycleLabel = tx.billing_cycle === 'yearly' ? t('settings.tx_yearly') : t('settings.tx_monthly')
                return (
                  <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 hidden sm:table-cell">
                      {tx.plan?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{cycleLabel}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {tx.amount.toLocaleString('fr-FR')} {tx.currency}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FacturationTab() {
  const { t } = useTranslation()
  const qc                  = useQueryClient()
  const subscriptionExpired = useAuthStore((s) => s.subscriptionExpired)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn:  getTenantSettings,
    enabled:  !subscriptionExpired,
    retry:    false,
  })

  const { register, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm<FacturationValues>({
    resolver: zodResolver(facturationSchema),
  })

  useEffect(() => {
    if (data) reset({
      invoice_footer: data.invoice_footer ?? '',
      invoice_prefix: data.invoice_prefix ?? '',
      pdf_template:   (data.pdf_template as FacturationValues['pdf_template']) ?? 'classic',
    })
  }, [data, reset])

  const mutation = useMutation({
    mutationFn: (v: FacturationValues) => updateTenantSettings({
      invoice_footer: v.invoice_footer || null,
      invoice_prefix: v.invoice_prefix || null,
      pdf_template:   v.pdf_template   || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-settings'] }); toast.success(t('settings.saved_billing')) },
    onError:   (err) => toast.error(getApiErrorMessage(err)),
  })

  if (subscriptionExpired) return <SubscriptionLockedNotice />
  if (isLoading) return <div className="text-sm text-gray-400">{t('settings.loading')}</div>
  if (isError) return <div className="rounded-xl bg-red-50 px-4 py-6 text-center text-sm text-red-600">{t('settings.load_error')}</div>

  return (
    <div className="space-y-8">
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="max-w-xl space-y-5">
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">{t('settings.billing_title')}</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('settings.invoice_footer')}
        </label>
        <textarea
          rows={3}
          placeholder={t('settings.invoice_footer_placeholder')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary resize-none"
          {...register('invoice_footer')}
        />
        <p className="mt-1 text-xs text-gray-400">{t('settings.invoice_footer_hint')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('settings.invoice_prefix')}
        </label>
        <input
          type="text"
          maxLength={10}
          placeholder={t('settings.invoice_prefix_placeholder')}
          className="w-48 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-mono"
          {...register('invoice_prefix')}
        />
        <p className="mt-1 text-xs text-gray-400">{t('settings.invoice_prefix_hint')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('settings.pdf_template')}</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            {
              value: 'classic' as const,
              label: t('settings.pdf_classic'),
              desc: t('settings.pdf_classic_desc'),
              preview: (
                <div className="w-full overflow-hidden rounded border border-gray-100">
                  <div className="flex items-center justify-between bg-brand-primary px-2 py-1.5">
                    <div>
                      <div className="h-1.5 w-12 rounded bg-white/70 mb-0.5" />
                      <div className="h-1 w-8 rounded bg-white/40" />
                    </div>
                    <div className="text-right">
                      <div className="h-1.5 w-10 rounded bg-white/70 mb-0.5" />
                      <div className="h-1 w-8 rounded bg-white/50" />
                    </div>
                  </div>
                  <div className="bg-white p-1.5 space-y-1">
                    <div className="flex gap-1"><div className="flex-1 h-3.5 rounded bg-gray-100" /><div className="flex-1 h-3.5 rounded bg-gray-100" /></div>
                    <div className="h-0.5 w-full rounded bg-gray-200" />
                    <div className="h-0.5 w-4/5 rounded bg-gray-100" />
                    <div className="h-0.5 w-3/5 rounded bg-gray-100" />
                  </div>
                </div>
              ),
            },
            {
              value: 'moderne' as const,
              label: t('settings.pdf_modern'),
              desc: t('settings.pdf_modern_desc'),
              preview: (
                <div className="w-full overflow-hidden rounded border border-gray-100">
                  <div
                    className="flex items-center justify-between bg-white px-2 py-1.5"
                    style={{ borderTop: '2.5px solid var(--brand-primary, #2563eb)' }}
                  >
                    <div>
                      <div className="h-1.5 w-12 rounded bg-gray-800 mb-0.5" />
                      <div className="h-1 w-8 rounded bg-gray-300" />
                    </div>
                    <div className="text-right">
                      <div className="h-2 w-10 rounded bg-brand-primary mb-0.5" />
                      <div className="h-1 w-8 rounded bg-gray-300" />
                    </div>
                  </div>
                  <div className="bg-white p-1.5 space-y-1">
                    <div className="flex gap-1"><div className="flex-1 h-3.5 rounded bg-gray-100" /><div className="flex-1 h-3.5 rounded bg-gray-100" /></div>
                    <div className="h-0.5 w-full rounded bg-gray-200" />
                    <div className="h-0.5 w-4/5 rounded bg-gray-100" />
                    <div className="h-0.5 w-3/5 rounded bg-gray-100" />
                  </div>
                </div>
              ),
            },
          ]).map(({ value, label, desc, preview }) => (
            <label key={value}
              className="flex flex-col gap-2 rounded-xl border-2 p-2.5 cursor-pointer transition has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/5 border-gray-200 hover:border-gray-300">
              <input type="radio" value={value} {...register('pdf_template')} className="sr-only" />
              {preview}
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{label}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting || mutation.isPending} disabled={!isDirty}>
          {t('common.save')}
        </Button>
      </div>
    </form>

    <hr className="border-gray-100 dark:border-gray-700" />
    <InvoiceHistory />
    </div>
  )
}

// ─── VenteTab ─────────────────────────────────────────────────────────────────

const venteSchema = z.object({
  currency:                z.string().min(3).max(3),
  default_vat_rate:        z.number().min(0).max(100).default(0),
  vat_label:               z.string().max(20).default('TVA'),
  pos_payment_methods:     z.array(z.string()).default(['cash']),
  pos_receipt_auto_print:  z.boolean().default(false),
})
type VenteValues = z.infer<typeof venteSchema>

const POS_PAYMENT_OPTIONS = [
  { value: 'cash',         label: 'Espèces' },
  { value: 'wave',         label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'free_money',   label: 'Free Money' },
  { value: 'card',         label: 'Carte bancaire' },
  { value: 'cheque',       label: 'Chèque' },
  { value: 'transfer',     label: 'Virement' },
]

function VenteTab() {
  const { t } = useTranslation()
  const qc                  = useQueryClient()
  const subscriptionExpired = useAuthStore((s) => s.subscriptionExpired)
  const setAuth             = useAuthStore((s) => s.setAuth)
  const token               = useAuthStore((s) => s.token)
  const user                = useAuthStore((s) => s.user)
  const perms               = useAuthStore((s) => s.permissions)
  const tenant              = useAuthStore((s) => s.tenant)
  const subscription        = useAuthStore((s) => s.subscription)
  const planFeatures        = useAuthStore((s) => s.planFeatures)
  const [saved, setSaved]   = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn:  getTenantSettings,
    enabled:  !subscriptionExpired,
    retry:    false,
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm<VenteValues>({
    resolver: zodResolver(venteSchema),
    defaultValues: { currency: 'XOF', default_vat_rate: 0, vat_label: 'TVA', pos_payment_methods: ['cash'], pos_receipt_auto_print: false },
  })

  const posMethods = watch('pos_payment_methods')

  useEffect(() => {
    if (data) {
      reset({
        currency:               data.currency,
        default_vat_rate:       data.default_vat_rate ?? 0,
        vat_label:              data.vat_label ?? 'TVA',
        pos_payment_methods:    data.pos_payment_methods ?? ['cash'],
        pos_receipt_auto_print: data.pos_receipt_auto_print ?? false,
      })
    }
  }, [data, reset])

  const toggleMethod = (val: string) => {
    const current = posMethods ?? []
    if (current.includes(val)) {
      if (current.length <= 1) return // au moins un mode requis
      setValue('pos_payment_methods', current.filter((m) => m !== val), { shouldDirty: true })
    } else {
      setValue('pos_payment_methods', [...current, val], { shouldDirty: true })
    }
  }

  const mutation = useMutation({
    mutationFn: (vals: VenteValues) => updateTenantSettings({
      currency:               vals.currency,
      default_vat_rate:       vals.default_vat_rate,
      vat_label:              vals.vat_label || 'TVA',
      pos_payment_methods:    vals.pos_payment_methods,
      pos_receipt_auto_print: vals.pos_receipt_auto_print,
    }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['tenant-settings'] })
      if (token && user) {
        setAuth(token, user, perms, {
          api_key:         tenant?.api_key ?? '',
          name:            updated.name,
          currency:        updated.currency,
          sector:          updated.sector,
          rccm:            updated.rccm ?? null,
          ninea:           updated.ninea ?? null,
          primary_color:   updated.primary_color,
          secondary_color: updated.secondary_color,
          logo_url:        updated.logo_url ?? null,
          slug:            tenant?.slug ?? '',
          locale:          tenant?.locale ?? 'fr',
          timezone:        tenant?.timezone ?? 'Africa/Dakar',
        }, subscription, planFeatures)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success(t('settings.saved_sales'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  if (subscriptionExpired) return <SubscriptionLockedNotice />
  if (isLoading) return <div className="text-sm text-gray-400">{t('settings.loading')}</div>
  if (isError) return <div className="rounded-xl bg-red-50 px-4 py-6 text-center text-sm text-red-600">{t('settings.load_error')}</div>

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-8">

      {/* Devise */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CurrencyDollarIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('settings.currency')}</h2>
        </div>
        <div className="max-w-xs">
          <Select {...register('currency')}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.symbol}{c.decimals === 0 ? ` ${t('settings.no_cents')}` : ''}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-gray-400">{t('settings.currency_hint')}</p>
        </div>
      </div>

      <hr className="border-gray-100 dark:border-gray-700" />

      {/* TVA */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ReceiptPercentIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('settings.vat_section')}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-md">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.vat_rate')}</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              {...register('default_vat_rate', { valueAsNumber: true })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
            <p className="mt-1 text-xs text-gray-400">{t('settings.vat_rate_hint')}</p>
          </div>
          <Input
            label={t('settings.vat_label')}
            placeholder="TVA"
            hint={t('settings.vat_label_hint')}
            {...register('vat_label')}
          />
        </div>
      </div>

      <hr className="border-gray-100 dark:border-gray-700" />

      {/* Modes de paiement POS */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DevicePhoneMobileIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('settings.pos_payment')}</h2>
        </div>
        <p className="mb-3 text-xs text-gray-500">{t('settings.pos_payment_hint')}</p>
        <div className="flex flex-wrap gap-2">
          {POS_PAYMENT_OPTIONS.map(({ value, label }) => {
            const active = (posMethods ?? []).includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleMethod(value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <hr className="border-gray-100 dark:border-gray-700" />

      {/* Impression automatique */}
      <div>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            role="switch"
            aria-checked={watch('pos_receipt_auto_print')}
            {...register('pos_receipt_auto_print')}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-primary"
          />
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.auto_print')}</span>
            <p className="text-xs text-gray-400 mt-0.5">{t('settings.auto_print_hint')}</p>
          </div>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
          {t('common.save')}
        </Button>
        {saved && <span className="text-sm text-emerald-600 font-medium">{t('settings.saved_ok')}</span>}
      </div>
    </form>
  )
}

// ─── EmailTab ─────────────────────────────────────────────────────────────────

function EmailTab() {
  const subscriptionExpired = useAuthStore((s) => s.subscriptionExpired)
  if (subscriptionExpired) return <SubscriptionLockedNotice />
  return (
    <div className="space-y-6">
      <SmtpSection />
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('boutique')

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'boutique',    label: t('settings.shop_tab'),    icon: <BuildingStorefrontIcon className="h-4 w-4" /> },
    { id: 'vente',       label: t('settings.sales_tab'),   icon: <CreditCardIcon className="h-4 w-4" /> },
    { id: 'facturation', label: t('settings.billing_tab'), icon: <DocumentTextIcon className="h-4 w-4" /> },
    { id: 'email',       label: t('settings.email_tab'),   icon: <EnvelopeSmtpIcon className="h-4 w-4" /> },
    { id: 'users',       label: t('settings.users_tab'),   icon: <UsersIcon className="h-4 w-4" /> },
    { id: 'groups',      label: t('settings.groups_tab'),  icon: <ShieldCheckIcon className="h-4 w-4" /> },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">{t('settings.title')}</h1>

      {/* Carte abonnement — toujours visible en haut */}
      <SubscriptionInfoCard />

      <div className="overflow-x-auto">
        <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-700 p-1 min-w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 sm:px-4 text-sm font-medium transition whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.icon}
              <span className="hidden xs:inline sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-800 p-4 sm:p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        {activeTab === 'boutique'    && <BoutiqueTab />}
        {activeTab === 'vente'       && <VenteTab />}
        {activeTab === 'facturation' && <FacturationTab />}
        {activeTab === 'email'       && <EmailTab />}
        {activeTab === 'users'       && <UsersTab />}
        {activeTab === 'groups'      && <GroupsTab />}
      </div>
    </div>
  )
}
