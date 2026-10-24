import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  SquarePen,
  Trash2,
  Building2,
  MapPin,
  Warehouse,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getBranches, createBranch, updateBranch, deleteBranch } from '@/services/api/branches'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import type { Branch } from '@/types'

// ─── Icons par type ──────────────────────────────────────────────────────────

const TYPE_META = {
  principal: { label: 'Principal',  icon: Building2, color: 'text-brand-primary' },
  sync:      { label: 'Succursale', icon: MapPin,    color: 'text-blue-500' },
  warehouse: { label: 'Entrepôt',   icon: Warehouse, color: 'text-amber-500' },
} as const

// ─── Schémas Zod ─────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:          z.string().min(1, 'Nom requis').max(120),
  type:          z.enum(['sync', 'warehouse']),
  address:       z.string().max(500).optional(),
  phone:         z.string().max(30).optional(),
  display_order: z.number().int().min(0).optional(),
})

const editSchema = z.object({
  name:          z.string().min(1, 'Nom requis').max(120),
  address:       z.string().max(500).optional(),
  phone:         z.string().max(30).optional(),
  is_active:     z.boolean(),
  display_order: z.number().int().min(0).optional(),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues   = z.infer<typeof editSchema>

// ─── Modal Création ───────────────────────────────────────────────────────────

function CreateBranchModal({ onClose }: { onClose: () => void }) {
  const { t }  = useTranslation()
  const qc     = useQueryClient()
  const setAvailableBranches = useAuthStore((s) => s.setAvailableBranches)

  const { register, handleSubmit, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { type: 'sync' },
  })

  const mutation = useMutation({
    mutationFn: (data: CreateValues) => createBranch({
      name:          data.name,
      type:          data.type,
      address:       data.address || null,
      phone:         data.phone   || null,
      display_order: data.display_order,
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['branches'] })
      // Rafraîchit le store pour que BranchSelector se mette à jour
      const branches = await getBranches()
      setAvailableBranches(branches)
      toast.success('Succursale créée')
      onClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return (
    <Modal title="Nouvelle succursale" onClose={onClose}>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
          <Input {...register('name')} placeholder="Ex : Succursale Plateau" />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
          <Select {...register('type')}>
            <option value="sync">Succursale (POS + stock propre)</option>
            <option value="warehouse">Entrepôt (stock uniquement)</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
          <Input {...register('address')} placeholder="Rue, Quartier, Ville" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
          <Input {...register('phone')} placeholder="+221 77 000 00 00" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Création…' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Édition ────────────────────────────────────────────────────────────

function EditBranchModal({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const qc     = useQueryClient()
  const setAvailableBranches = useAuthStore((s) => s.setAvailableBranches)
  const setActiveBranch      = useAuthStore((s) => s.setActiveBranch)
  const activeBranch         = useAuthStore((s) => s.activeBranch)

  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name:          branch.name,
      address:       branch.address ?? '',
      phone:         branch.phone ?? '',
      is_active:     branch.is_active,
      display_order: branch.display_order,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: EditValues) => updateBranch(branch.uid, {
      name:          data.name,
      address:       data.address || null,
      phone:         data.phone   || null,
      is_active:     data.is_active,
      display_order: data.display_order,
    }),
    onSuccess: async (updated) => {
      await qc.invalidateQueries({ queryKey: ['branches'] })
      const branches = await getBranches()
      setAvailableBranches(branches)
      // Sync si c'est la succursale active
      if (activeBranch?.uid === updated.uid) setActiveBranch(updated)
      toast.success('Succursale mise à jour')
      onClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return (
    <Modal title={`Modifier — ${branch.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
          <Input {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Type immuable pour principal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
            'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600',
            'text-gray-500 dark:text-gray-400',
          )}>
            {TYPE_META[branch.type].label}
            {branch.isPrincipal ?? branch.type === 'principal' ? (
              <span className="text-xs text-gray-400 ml-auto">non modifiable</span>
            ) : null}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
          <Input {...register('address')} placeholder="Rue, Quartier, Ville" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
          <Input {...register('phone')} />
        </div>

        {/* is_active — non modifiable pour principal */}
        {branch.type !== 'principal' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              role="switch"
              {...register('is_active')}
              className="h-4 w-4 rounded accent-brand-primary"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Succursale active</span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function BranchesTab() {
  const { t }    = useTranslation()
  const qc       = useQueryClient()
  const permissions          = useAuthStore((s) => s.permissions)
  const setAvailableBranches = useAuthStore((s) => s.setAvailableBranches)
  const canEdit = permissions.includes('settings.edit')

  const [creating, setCreating]   = useState(false)
  const [editing, setEditing]     = useState<Branch | null>(null)
  const [deletingUid, setDeletingUid] = useState<string | null>(null)

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn:  getBranches,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['branches'] })
      const updated = await getBranches()
      setAvailableBranches(updated)
      toast.success('Succursale supprimée')
      setDeletingUid(null)
    },
    onError: (err) => { toast.error(getApiErrorMessage(err)); setDeletingUid(null) },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Succursales</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Gérez vos points de vente et entrepôts
          </p>
        </div>
        {canEdit && (
          <Button type="button" variant="primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nouvelle succursale
          </Button>
        )}
      </div>

      {/* Liste */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {branches.map((branch) => {
          const meta = TYPE_META[branch.type]
          const Icon = meta.icon
          return (
            <div
              key={branch.uid}
              className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
            >
              <div className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                'bg-gray-100 dark:bg-gray-700',
              )}>
                <Icon className={cn('h-5 w-5', meta.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {branch.name}
                  </span>
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1',
                    branch.is_active
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800'
                      : 'bg-gray-100 text-gray-500 ring-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-600',
                  )}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{meta.label}</span>
                </div>
                {branch.address && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{branch.address}</p>
                )}
              </div>

              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditing(branch)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
                    aria-label={`Modifier ${branch.name}`}
                  >
                    <SquarePen className="h-4 w-4" />
                  </button>
                  {branch.type !== 'principal' && (
                    <button
                      type="button"
                      onClick={() => setDeletingUid(branch.uid)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                      aria-label={`Supprimer ${branch.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {branches.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
            Aucune succursale configurée.
          </div>
        )}
      </div>

      {/* Modals */}
      {creating && <CreateBranchModal onClose={() => setCreating(false)} />}
      {editing  && <EditBranchModal  branch={editing} onClose={() => setEditing(null)} />}

      {/* Confirmation suppression */}
      {deletingUid && (
        <Modal
          title="Supprimer cette succursale ?"
          onClose={() => setDeletingUid(null)}
        >
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Cette action est irréversible. Les ventes et mouvements de stock associés conserveront leur référence à cette succursale.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeletingUid(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deletingUid)}
            >
              {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
