import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  UserIcon,
  UsersIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  BuildingStorefrontIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
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

type Tab = 'boutique' | 'profil' | 'users' | 'groups'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'boutique', label: 'Boutique',     icon: <BuildingStorefrontIcon className="h-4 w-4" /> },
  { id: 'profil',   label: 'Mon profil',   icon: <UserIcon className="h-4 w-4" /> },
  { id: 'users',    label: 'Utilisateurs', icon: <UsersIcon className="h-4 w-4" /> },
  { id: 'groups',   label: 'Groupes',      icon: <ShieldCheckIcon className="h-4 w-4" /> },
]

// ─── Schemas ─────────────────────────────────────────────────────────────────

const profilSchema = z.object({
  name:     z.string().min(2, 'Nom requis'),
  email:    z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères min').or(z.literal('')).optional(),
})
type ProfilValues = z.infer<typeof profilSchema>

const userSchema = z.object({
  name:      z.string().min(2, 'Nom requis'),
  email:     z.string().email('Email invalide'),
  password:  z.string().min(8, '8 caractères min').or(z.literal('')).optional(),
  is_active: z.boolean().optional(),
})
type UserValues = z.infer<typeof userSchema>

const groupSchema = z.object({
  name:        z.string().min(2, 'Nom requis'),
  description: z.string().nullable().optional(),
})
type GroupValues = z.infer<typeof groupSchema>

// ─── BoutiqueTab ─────────────────────────────────────────────────────────────

const boutiqueSchema = z.object({
  name:          z.string().min(2, 'Nom requis'),
  sector:        z.enum(['general', 'food', 'fashion', 'cosmetic', 'pharmacy', 'electronics', 'services']),
  currency:      z.string().min(3).max(3),
  phone_country: z.string().length(2).default('SN'),
  phone:         z.string().optional(),
  email:         z.string().email('Email invalide').or(z.literal('')).optional(),
  address:       z.string().optional(),
  city:          z.string().optional(),
  rccm:          z.string().optional(),
  ninea:         z.string().optional(),
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
}

function BoutiqueTab() {
  const setAuth   = useAuthStore((s) => s.setAuth)
  const token     = useAuthStore((s) => s.token)
  const user      = useAuthStore((s) => s.user)
  const perms     = useAuthStore((s) => s.permissions)
  const [saved, setSaved] = useState(false)

  const [logoFile, setLogoFile]       = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo]   = useState(false)
  const [logoError, setLogoError]     = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn:  getTenantSettings,
  })

  const { register, handleSubmit, reset, control, formState: { errors, isDirty } } = useForm<BoutiqueValues>({
    resolver: zodResolver(boutiqueSchema),
    defaultValues: { phone_country: 'SN' },
  })

  useEffect(() => {
    if (data) {
      reset({
        name:          data.name,
        sector:        data.sector as BoutiqueValues['sector'],
        currency:      data.currency,
        phone_country: 'SN',
        phone:         data.phone ?? '',
        email:         data.email ?? '',
        address:       data.address ?? '',
        city:          data.city ?? '',
        rccm:          data.rccm ?? '',
        ninea:         data.ninea ?? '',
      })
      setLogoPreview(data.logo_url ?? null)
    }
  }, [data, reset])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!ACCEPTED.includes(file.type)) {
      setLogoError('Format non supporté. Utilisez JPEG, PNG, WebP ou SVG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo trop lourd. Maximum 2 Mo.')
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
        name:          vals.name,
        sector:        vals.sector,
        currency:      vals.currency,
        phone:         normalizePhone(vals.phone),
        email:         vals.email || null,
        address:       vals.address || null,
        city:          vals.city || null,
        rccm:          vals.rccm || null,
        ninea:         vals.ninea || null,
      },
      logoFile,
      removeLogo,
    ),
    onSuccess: (updated) => {
      if (token && user) {
        setAuth(token, user, perms, {
          name:            updated.name,
          currency:        updated.currency,
          sector:          updated.sector,
          rccm:            updated.rccm ?? null,
          ninea:           updated.ninea ?? null,
          primary_color:   updated.primary_color,
          secondary_color: updated.secondary_color,
          logo_url:        updated.logo_url ?? null,
        })
      }
      setLogoFile(null)
      setRemoveLogo(false)
      setLogoPreview(updated.logo_url ?? null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success('Paramètres de la boutique enregistrés.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  if (isLoading) return <div className="text-sm text-gray-400">Chargement…</div>

  return (
    <form onSubmit={handleSubmit((v) => { if (!logoError) mutation.mutate(v) })} className="space-y-6">
      {/* Logo */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Logo de la boutique</p>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="relative">
              <img
                src={logoPreview}
                alt="Logo"
                className="h-20 w-20 rounded-xl object-contain ring-1 ring-gray-200 bg-gray-50 p-1"
              />
              <button
                type="button"
                onClick={handleLogoRemove}
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                aria-label="Supprimer le logo"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand-primary hover:text-brand-primary transition"
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
              {logoPreview ? 'Changer le logo' : 'Ajouter un logo'}
            </button>
            <p className="text-xs text-gray-400">JPEG, PNG, WebP ou SVG — max 2 Mo</p>
            {logoError && <p className="text-xs text-red-500">{logoError}</p>}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoChange}
            aria-label="Sélectionner un logo"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Nom du commerce" error={errors.name?.message} {...register('name')} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Secteur d'activité</label>
          <Select {...register('sector')}>
            {Object.entries(SECTOR_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Devise</label>
          <Select {...register('currency')}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.symbol}
                {c.decimals === 0 ? ' (sans centimes)' : ' (avec centimes)'}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-gray-400">Affecte tous les montants affichés dans l'application.</p>
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
                label="Téléphone"
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
        <Input label="Email" type="email" {...register('email')} />
        <Input label="Adresse" {...register('address')} />
        <Input label="Ville" {...register('city')} />
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-gray-700">Informations légales <span className="text-xs font-normal text-gray-400">(optionnel — apparaissent sur les factures)</span></p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="RCCM"
            placeholder="SN-DKR-2024-B-12345"
            hint="Registre du Commerce et du Crédit Mobilier"
            {...register('rccm')}
          />
          <Input
            label="NINEA"
            placeholder="012345678"
            hint="Numéro d'Identification Nationale des Entreprises"
            {...register('ninea')}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
          Enregistrer
        </Button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Paramètres enregistrés ✓</span>}
      </div>
    </form>
  )
}

// ─── ProfilTab ────────────────────────────────────────────────────────────────

function ProfilTab() {
  const qc      = useQueryClient()
  const me      = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const token   = useAuthStore((s) => s.token)
  const perms   = useAuthStore((s) => s.permissions)
  const tenant  = useAuthStore((s) => s.tenant)
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfilValues>({
    resolver: zodResolver(profilSchema),
    defaultValues: { name: me?.name ?? '', email: me?.email ?? '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: (vals: ProfilValues) => {
      const body: Record<string, unknown> = { name: vals.name, email: vals.email }
      if (vals.password) body.password = vals.password
      return updateUser(me!.id, body)
    },
    onSuccess: (updated) => {
      if (token && tenant) {
        setAuth(token, { ...me!, name: updated.name, email: updated.email }, perms, tenant)
      }
      qc.invalidateQueries({ queryKey: ['users'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success('Profil mis à jour.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return (
    <div className="max-w-md">
      <h2 className="mb-6 text-base font-semibold text-gray-800">Informations personnelles</h2>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
          <input
            {...register('name')}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" {...register('email')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition" />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nouveau mot de passe <span className="font-normal text-gray-400">(laisser vide pour ne pas changer)</span>
          </label>
          <input type="password" autoComplete="new-password" {...register('password')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition" />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending} disabled={!isDirty && !mutation.isPending}>
            Enregistrer
          </Button>
          {saved && <span className="text-sm text-green-600">Modifications enregistrées ✓</span>}
          {mutation.isError && <span className="text-sm text-red-500">Erreur lors de l'enregistrement</span>}
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
  const qc = useQueryClient()
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])
  const [apiError, setApiError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserValues>({
    resolver: zodResolver(userSchema),
  })

  useEffect(() => {
    if (!isOpen) return
    reset({
      name:      editing?.name     ?? '',
      email:     editing?.email    ?? '',
      password:  '',
      is_active: editing?.is_active ?? true,
    })
    setSelectedGroupIds(editing?.groups?.map((g) => g.id) ?? [])
    setApiError(null)
  }, [isOpen, editing, reset])

  const mutation = useMutation({
    mutationFn: async (vals: UserValues) => {
      if (editing) {
        const body: Record<string, unknown> = { name: vals.name, email: vals.email, is_active: vals.is_active }
        if (vals.password) body.password = vals.password
        const u = await updateUser(editing.id, body)
        await syncUserGroups(u.id, selectedGroupIds)
        return u
      }
      return createUser({
        name:      vals.name,
        email:     vals.email,
        password:  vals.password ?? '',
        is_active: vals.is_active ?? true,
        group_ids: selectedGroupIds,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(editing ? 'Utilisateur mis à jour.' : 'Utilisateur créé.')
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setApiError(msg ?? "Erreur lors de l'enregistrement.")
    },
  })

  const toggleGroup = (id: number) =>
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="user-form" className="flex-1" loading={mutation.isPending}>
            {editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      }
    >
      <form id="user-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
          <input {...register('name')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition" />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" {...register('email')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition" />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe{!editing && ' *'}
            {editing && <span className="font-normal text-gray-400 ml-1">(vide = inchangé)</span>}
          </label>
          <input type="password" autoComplete="new-password" {...register('password')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition" />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active_u" {...register('is_active')} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
          <label htmlFor="is_active_u" className="text-sm text-gray-700">Compte actif</label>
        </div>

        {groups.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Groupes</label>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const active = selectedGroupIds.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
  const qc = useQueryClient()
  const me = useAuthStore((s) => s.user)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState<UserWithGroups | null>(null)
  const [deletingId, setDeletingId]   = useState<number | null>(null)
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur supprimé.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
    onSettled: () => setDeletingId(null),
  })

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit   = (u: UserWithGroups) => { setEditing(u); setModalOpen(true) }

  const users = page?.data ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">Utilisateurs</h2>
        <Button size="sm" icon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>
          Nouvel utilisateur
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
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Groupes</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {u.name}
                    {u.id === me?.id && <span className="ml-2 text-xs text-indigo-500">(vous)</span>}
                    <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(u.groups ?? []).map((g) => (
                        <Badge key={g.id} variant="info" size="sm">{g.name}</Badge>
                      ))}
                      {(u.groups ?? []).length === 0 && <span className="text-xs text-gray-400">Aucun</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.is_active ? 'success' : 'default'} dot>
                      {u.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition"
                        title="Modifier"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      {u.id !== me?.id && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(u)}
                          disabled={deletingId === u.id}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-40"
                          title="Supprimer"
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
        title="Supprimer l'utilisateur"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return
                setDeletingId(deleteTarget.id)
                deleteMutation.mutate(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Voulez-vous supprimer{' '}
          <span className="font-semibold text-gray-900">«{deleteTarget?.name}»</span> ?
          {' '}Cette action est irréversible.
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
  customers:  'Clients',
  sales:      'Ventes',
  pos:        'Point de vente',
  users:      'Utilisateurs',
  groups:     'Groupes',
}

interface PermissionsModalProps {
  group:   Group | null
  isOpen:  boolean
  onClose: () => void
}

function PermissionsModal({ group, isOpen, onClose }: PermissionsModalProps) {
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
    mutationFn: () => syncGroupPermissions(group!.id, checked),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Permissions mises à jour.')
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
          <Button variant="secondary" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button className="flex-1" loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {Object.entries(byModule).map(([module, perms]) => {
          const ids = (perms as Permission[]).map((p) => p.id)
          const checkedCount = ids.filter((id) => checked.includes(id)).length

          return (
            <div key={module} className="rounded-lg border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleModule(perms as Permission[])}
                className="flex w-full items-center justify-between bg-gray-50 px-4 py-2.5 text-left hover:bg-gray-100 transition"
              >
                <span className="text-sm font-semibold text-gray-700">
                  {MODULE_LABELS[module] ?? module}
                </span>
                <span className="text-xs text-gray-400">{checkedCount}/{ids.length}</span>
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
                    <span className="text-sm text-gray-600">{p.display_name}</span>
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
        ? updateGroup(editing.id, vals as Partial<CreateGroupData>)
        : createGroup(vals as CreateGroupData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      toast.success(editing ? 'Groupe mis à jour.' : 'Groupe créé.')
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setApiError(msg ?? "Erreur lors de l'enregistrement.")
    },
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Modifier le groupe' : 'Nouveau groupe'}
      size="sm"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="group-form" className="flex-1" loading={mutation.isPending}>
            {editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      }
    >
      <form id="group-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
          <input {...register('name')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition" />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="font-normal text-gray-400">(optionnel)</span>
          </label>
          <textarea {...register('description')} rows={2} className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition" />
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
  const qc = useQueryClient()
  const [groupModalOpen, setGroupModalOpen]   = useState(false)
  const [editing, setEditing]                 = useState<Group | null>(null)
  const [permGroup, setPermGroup]             = useState<Group | null>(null)
  const [permModalOpen, setPermModalOpen]     = useState(false)
  const [deletingId, setDeletingId]           = useState<number | null>(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<Group | null>(null)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: getGroups,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); toast.success('Groupe supprimé.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
    onSettled: () => setDeletingId(null),
  })

  const openCreate = () => { setEditing(null); setGroupModalOpen(true) }
  const openEdit   = (g: Group) => { setEditing(g); setGroupModalOpen(true) }
  const openPerms  = (g: Group) => { setPermGroup(g); setPermModalOpen(true) }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">Groupes & permissions</h2>
        <Button size="sm" icon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>
          Nouveau groupe
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="font-medium text-gray-800">{g.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span>{g.users_count ?? 0} utilisateur{(g.users_count ?? 0) > 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{g.permissions?.length ?? 0} permission{(g.permissions?.length ?? 0) > 1 ? 's' : ''}</span>
                  {g.description && <><span>·</span><span className="italic">{g.description}</span></>}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => openPerms(g)}
                  className="rounded px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
                >
                  Permissions
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(g)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition"
                  title="Renommer"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteGroupTarget(g)}
                  disabled={deletingId === g.id}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-40"
                  title="Supprimer"
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
        title="Supprimer le groupe"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteGroupTarget(null)}>Annuler</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (!deleteGroupTarget) return
                setDeletingId(deleteGroupTarget.id)
                deleteMutation.mutate(deleteGroupTarget.id)
                setDeleteGroupTarget(null)
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Voulez-vous supprimer le groupe{' '}
          <span className="font-semibold text-gray-900">«{deleteGroupTarget?.name}»</span> ?
          {' '}Les utilisateurs de ce groupe perdront ses permissions.
        </p>
      </Modal>
    </div>
  )
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('boutique')

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>

      <div className="overflow-x-auto">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 min-w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 sm:px-4 text-sm font-medium transition whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}
              <span className="hidden xs:inline sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-gray-100">
        {activeTab === 'boutique' && <BoutiqueTab />}
        {activeTab === 'profil'   && <ProfilTab />}
        {activeTab === 'users'    && <UsersTab />}
        {activeTab === 'groups'   && <GroupsTab />}
      </div>
    </div>
  )
}
