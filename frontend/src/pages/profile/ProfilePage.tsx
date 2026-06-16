import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCircleIcon, KeyIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { updateProfile } from '@/services/api/profile'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from '@/store/toastStore'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// ── Schémas ───────────────────────────────────────────────────────────────────

const infoSchema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 car.)'),
})
type InfoValues = z.infer<typeof infoSchema>

const passwordSchema = z.object({
  current_password:      z.string().min(1, 'Mot de passe actuel requis'),
  password:              z.string().min(8, '8 caractères minimum'),
  password_confirmation: z.string().min(1, 'Confirmation requise'),
}).refine((d) => d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas.',
  path: ['password_confirmation'],
})
type PasswordValues = z.infer<typeof passwordSchema>

// ── Sous-composant : carte section ────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-gray-500">{icon}</span>
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Sous-composant : champ mot de passe avec œil ─────────────────────────────

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
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          {...registration}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete ?? 'off'}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm outline-none focus:border-indigo-400 transition"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
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

// ── Page principale ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const qc           = useQueryClient()
  const me           = useAuthStore((s) => s.user)
  const setAuth      = useAuthStore((s) => s.setAuth)
  const token        = useAuthStore((s) => s.token)
  const perms        = useAuthStore((s) => s.permissions)
  const tenant       = useAuthStore((s) => s.tenant)
  const subscription = useAuthStore((s) => s.subscription)
  const planFeatures = useAuthStore((s) => s.planFeatures)

  const [infoError,     setInfoError]     = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // ── Formulaire infos personnelles (nom uniquement) ────────────────────────

  const infoForm = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: { name: me?.name ?? '' },
  })

  const infoMutation = useMutation({
    mutationFn: (v: InfoValues) => updateProfile({ name: v.name }),
    onSuccess: (updated) => {
      if (token && tenant) {
        setAuth(token, { ...me!, name: updated.name }, perms, tenant, subscription, planFeatures)
      }
      qc.invalidateQueries({ queryKey: ['users'] })
      setInfoError(null)
      toast.success('Nom mis à jour.')
      infoForm.reset({ name: updated.name })
    },
    onError: (err) => setInfoError(getApiErrorMessage(err)),
  })

  // ── Formulaire changement de mot de passe ─────────────────────────────────

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
      toast.success('Mot de passe modifié avec succès.')
      passwordForm.reset()
    },
    onError: (err) => setPasswordError(getApiErrorMessage(err)),
  })

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mon profil</h1>
        <p className="mt-0.5 text-sm text-gray-500">{me?.email}</p>
      </div>

      {/* ── Informations personnelles ───────────────────────────────────── */}
      <Card title="Informations personnelles" icon={<UserCircleIcon className="h-5 w-5" />}>
        {infoError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{infoError}</p>
        )}
        <form onSubmit={infoForm.handleSubmit((v) => infoMutation.mutate(v))} className="space-y-4">
          <Input
            label="Nom complet"
            error={infoForm.formState.errors.name?.message}
            {...infoForm.register('name')}
          />
          {/* Email en lecture seule — identifiant de connexion non modifiable ici */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse email
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              <span className="flex-1">{me?.email}</span>
              <LockClosedIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            </div>
            <p className="mt-1 text-xs text-gray-400">L'email est l'identifiant de connexion et ne peut pas être modifié ici.</p>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={infoMutation.isPending}
              disabled={!infoForm.formState.isDirty}
            >
              Enregistrer
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Changement de mot de passe ─────────────────────────────────── */}
      <Card title="Changer le mot de passe" icon={<KeyIcon className="h-5 w-5" />}>
        {passwordError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{passwordError}</p>
        )}
        <form onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))} className="space-y-4">
          <PasswordField
            label="Mot de passe actuel"
            autoComplete="current-password"
            error={passwordForm.formState.errors.current_password?.message}
            registration={passwordForm.register('current_password')}
          />
          <PasswordField
            label="Nouveau mot de passe"
            autoComplete="new-password"
            error={passwordForm.formState.errors.password?.message}
            registration={passwordForm.register('password')}
          />
          <PasswordField
            label="Confirmer le nouveau mot de passe"
            autoComplete="new-password"
            error={passwordForm.formState.errors.password_confirmation?.message}
            registration={passwordForm.register('password_confirmation')}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={passwordMutation.isPending}>
              Changer le mot de passe
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
