import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CameraIcon,
  TrashIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  UserCircleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { updateProfile, uploadAvatar, deleteAvatar } from '@/services/api/profile'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from '@/store/toastStore'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const LOCALE_OPTIONS: { value: string; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
]

function compressAvatar(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = reject
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      const MAX = 512
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('canvas toBlob failed')); return }
          resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.85,
      )
    }
    img.src = URL.createObjectURL(file)
  })
}

const infoSchema = z.object({
  name:   z.string().min(2),
  locale: z.enum(['fr', 'en']),
})
type InfoValues = z.infer<typeof infoSchema>

const passwordSchema = z.object({
  current_password:      z.string().min(1),
  password:              z.string().min(8),
  password_confirmation: z.string().min(1),
}).refine((d) => d.password === d.password_confirmation, {
  path: ['password_confirmation'],
})
type PasswordValues = z.infer<typeof passwordSchema>

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function PasswordField({
  label,
  autoComplete,
  error,
  registration,
}: {
  label: string
  autoComplete?: string
  error?: string
  registration: ReturnType<ReturnType<typeof useForm>['register']>
}) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          {...registration}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 pr-10 text-sm outline-none focus:border-indigo-400 transition"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={visible ? t('profile.hide_password') : t('profile.show_password')}
        >
          {visible
            ? <EyeSlashIcon className="h-4 w-4" />
            : <EyeIcon className="h-4 w-4" />
          }
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const qc           = useQueryClient()
  const me           = useAuthStore((s) => s.user)
  const setAuth      = useAuthStore((s) => s.setAuth)
  const token        = useAuthStore((s) => s.token)
  const perms        = useAuthStore((s) => s.permissions)
  const tenant       = useAuthStore((s) => s.tenant)
  const subscription = useAuthStore((s) => s.subscription)
  const planFeatures = useAuthStore((s) => s.planFeatures)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [infoError,     setInfoError]     = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const initials = me?.name
    ? me.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (data) => {
      if (token && tenant) {
        setAuth(token, { ...me!, avatar: data.avatar }, perms, tenant, subscription, planFeatures)
      }
      toast.success(t('profile.avatar_updated'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteAvatarMutation = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      if (token && tenant) {
        setAuth(token, { ...me!, avatar: null }, perms, tenant, subscription, planFeatures)
      }
      toast.success(t('profile.avatar_deleted'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const compressed = await compressAvatar(file)
      avatarMutation.mutate(compressed)
    } catch {
      toast.error(t('profile.avatar_error'))
    }
  }

  const infoForm = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      name:   me?.name ?? '',
      locale: (me?.locale ?? 'fr') as 'fr' | 'en',
    },
  })

  const infoMutation = useMutation({
    mutationFn: (v: InfoValues) => updateProfile({ name: v.name, locale: v.locale }),
    onSuccess: (updated) => {
      if (token && tenant) {
        setAuth(token, { ...me!, name: updated.name, locale: updated.locale }, perms, tenant, subscription, planFeatures)
      }
      if (updated.locale) {
        i18n.changeLanguage(updated.locale)
      }
      qc.invalidateQueries({ queryKey: ['users'] })
      setInfoError(null)
      toast.success(t('profile.name_updated'))
      infoForm.reset({ name: updated.name, locale: (updated.locale ?? 'fr') as 'fr' | 'en' })
    },
    onError: (err) => setInfoError(getApiErrorMessage(err)),
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  })

  const passwordMutation = useMutation({
    mutationFn: (v: PasswordValues) => updateProfile({
      name:                  me!.name,
      current_password:      v.current_password,
      password:              v.password,
      password_confirmation: v.password_confirmation,
    }),
    onSuccess: () => {
      setPasswordError(null)
      toast.success(t('profile.password_updated'))
      passwordForm.reset()
    },
    onError: (err) => setPasswordError(getApiErrorMessage(err)),
  })

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4 sm:p-6">

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 pt-2 pb-4">
        <div className="relative group">
          {me?.avatar ? (
            <img
              src={me.avatar}
              alt={me.name}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-lg"
            />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-primary text-white text-3xl font-bold ring-4 ring-white shadow-lg">
              {initials}
            </span>
          )}

          {avatarMutation.isPending && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label={t('profile.choose_avatar')}
          onChange={handleAvatarChange}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarMutation.isPending || deleteAvatarMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50"
          >
            <CameraIcon className="h-4 w-4" />
            {t('profile.change_avatar')}
          </button>

          {me?.avatar && (
            <button
              type="button"
              onClick={() => deleteAvatarMutation.mutate()}
              disabled={avatarMutation.isPending || deleteAvatarMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-500 shadow-sm hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
              {t('profile.delete_avatar')}
            </button>
          )}
        </div>

        <p className="text-sm text-gray-400 dark:text-gray-500">{me?.email}</p>
      </div>

      {/* Informations personnelles */}
      <Card title={t('profile.personal_info')} icon={<UserCircleIcon className="h-5 w-5" />}>
        {infoError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{infoError}</p>
        )}
        <form onSubmit={infoForm.handleSubmit((v) => infoMutation.mutate(v))} className="space-y-4">
          <Input
            label={t('profile.full_name')}
            error={infoForm.formState.errors.name?.message}
            {...infoForm.register('name')}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('profile.email_address')}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex-1">{me?.email}</span>
              <LockClosedIcon className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('profile.email_readonly')}</p>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <GlobeAltIcon className="h-4 w-4 text-gray-400" />
              {t('profile.interface_language')}
            </label>
            <Select {...infoForm.register('locale')}>
              {LOCALE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-gray-400">{t('profile.interface_language_hint')}</p>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={infoMutation.isPending}
              disabled={!infoForm.formState.isDirty}
            >
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Card>

      {/* Changement de mot de passe */}
      <Card title={t('profile.change_password')} icon={<KeyIcon className="h-5 w-5" />}>
        {passwordError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{passwordError}</p>
        )}
        <form onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))} className="space-y-4">
          <PasswordField
            label={t('profile.current_password')}
            autoComplete="current-password"
            error={passwordForm.formState.errors.current_password?.message}
            registration={passwordForm.register('current_password')}
          />
          <PasswordField
            label={t('profile.new_password')}
            autoComplete="new-password"
            error={passwordForm.formState.errors.password?.message}
            registration={passwordForm.register('password')}
          />
          <PasswordField
            label={t('profile.confirm_password')}
            autoComplete="new-password"
            error={passwordForm.formState.errors.password_confirmation?.message}
            registration={passwordForm.register('password_confirmation')}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={passwordMutation.isPending}>
              {t('profile.change_password')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
