import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import {
  CameraIcon, TrashIcon, EyeIcon, EyeSlashIcon,
  KeyIcon, LockClosedIcon, UserCircleIcon,
} from '@heroicons/react/24/outline'
import { useSuperAdminStore } from '@/store/superAdminStore'
import { updateAdminProfile, uploadAdminAvatar, deleteAdminAvatar } from '@/services/api/admin'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from '@/store/toastStore'

// Redimensionne et compresse l'avatar côté client (JPEG ≤ 512×512, qualité 0.85)
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
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('canvas toBlob failed')); return }
          resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
        },
        'image/jpeg', 0.85,
      )
    }
    img.src = URL.createObjectURL(file)
  })
}

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

// ── Composants dark ───────────────────────────────────────────────────────────

const labelCls = 'block text-sm font-medium text-gray-300 mb-1'
const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition'

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-800">
        <span className="text-indigo-400">{icon}</span>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function PasswordField({
  label, autoComplete, error, registration,
}: {
  label: string
  autoComplete?: string
  error?: string
  registration: ReturnType<ReturnType<typeof useForm>['register']>
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          {...registration}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          className={`${inputCls} pr-10`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-300"
          tabIndex={-1}
          aria-label={visible ? 'Masquer' : 'Afficher'}
        >
          {visible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminProfilePage() {
  const admin       = useSuperAdminStore((s) => s.admin)
  const updateAdmin = useSuperAdminStore((s) => s.updateAdmin)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [infoError,     setInfoError]     = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const initials = admin?.name
    ? admin.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'SA'

  // ── Avatar ───────────────────────────────────────────────────────────────

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAdminAvatar(file),
    onSuccess: (data) => {
      if (admin) updateAdmin({ ...admin, avatar: data.avatar })
      toast.success('Avatar mis à jour.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteAvatarMutation = useMutation({
    mutationFn: deleteAdminAvatar,
    onSuccess: () => {
      if (admin) updateAdmin({ ...admin, avatar: null })
      toast.success('Avatar supprimé.')
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
      toast.error('Impossible de lire ce fichier image.')
    }
  }

  // ── Formulaire infos ─────────────────────────────────────────────────────

  const infoForm = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: { name: admin?.name ?? '' },
  })

  const infoMutation = useMutation({
    mutationFn: (v: InfoValues) => updateAdminProfile({ name: v.name }),
    onSuccess: (updated) => {
      updateAdmin(updated)
      setInfoError(null)
      toast.success('Nom mis à jour.')
      infoForm.reset({ name: updated.name })
    },
    onError: (err) => setInfoError(getApiErrorMessage(err)),
  })

  // ── Formulaire mot de passe ───────────────────────────────────────────────

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  })

  const passwordMutation = useMutation({
    mutationFn: (v: PasswordValues) => updateAdminProfile({
      name:                  admin!.name,
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

  const avatarBusy = avatarMutation.isPending || deleteAvatarMutation.isPending

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4 sm:p-6">

      {/* ── Avatar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 pt-2 pb-4">
        <div className="relative group">
          {admin?.avatar ? (
            <img
              src={admin.avatar}
              alt={admin.name}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-gray-800 shadow-xl"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-gray-800 shadow-xl">
              {initials}
            </div>
          )}

          {/* Spinner upload */}
          {avatarMutation.isPending && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>

        {/* Input fichier caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Choisir un avatar"
          onChange={handleAvatarChange}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarBusy}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition disabled:opacity-50"
          >
            <CameraIcon className="h-4 w-4" />
            Changer l'avatar
          </button>

          {admin?.avatar && (
            <button
              type="button"
              onClick={() => deleteAvatarMutation.mutate()}
              disabled={avatarBusy}
              className="flex items-center gap-1.5 rounded-lg border border-red-800 bg-gray-900 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
              Supprimer
            </button>
          )}
        </div>

        <div className="text-center">
          <p className="text-base font-semibold text-white">{admin?.name}</p>
          <p className="text-sm text-gray-400">{admin?.email}</p>
          <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-400">
            Super Admin
          </span>
        </div>
      </div>

      {/* ── Informations personnelles ──────────────────────────────────────── */}
      <Card title="Informations personnelles" icon={<UserCircleIcon className="h-5 w-5" />}>
        {infoError && (
          <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-400">
            {infoError}
          </div>
        )}
        <form onSubmit={infoForm.handleSubmit((v) => infoMutation.mutate(v))} className="space-y-4">
          <div>
            <label className={labelCls}>Nom complet</label>
            <input {...infoForm.register('name')} className={inputCls} />
            {infoForm.formState.errors.name && (
              <p className="mt-1 text-xs text-red-400">{infoForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Adresse email</label>
            <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-500">
              <span className="flex-1">{admin?.email}</span>
              <LockClosedIcon className="h-3.5 w-3.5 shrink-0 text-gray-600" />
            </div>
            <p className="mt-1 text-xs text-gray-600">L'email ne peut pas être modifié ici.</p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={infoMutation.isPending || !infoForm.formState.isDirty}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {infoMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Card>

      {/* ── Changer le mot de passe ────────────────────────────────────────── */}
      <Card title="Changer le mot de passe" icon={<KeyIcon className="h-5 w-5" />}>
        {passwordError && (
          <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-400">
            {passwordError}
          </div>
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
            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {passwordMutation.isPending ? 'Modification…' : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
