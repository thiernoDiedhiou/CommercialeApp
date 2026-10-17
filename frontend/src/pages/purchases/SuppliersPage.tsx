import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilSquareIcon, TrashIcon, NoSymbolIcon, TruckIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/services/api/suppliers'
import PhoneInput, { normalizePhone } from '@/components/ui/PhoneInput'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import EmptyState from '@/components/ui/EmptyState'
import type { Supplier } from '@/types'

const schema = z.object({
  name:    z.string().min(1, 'Le nom est requis').max(200),
  country: z.string().length(2).default('SN'),
  phone:   z.string().optional(),
  email:   z.union([z.literal(''), z.string().email('Email invalide')]).optional(),
  address: z.string().optional(),
  notes:   z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const FORM_ID = 'supplier-form'

type ModalState = { mode: 'create' } | { mode: 'edit'; supplier: Supplier } | null

export default function SuppliersPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const navigate = useNavigate()

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // ── Données ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { search: debouncedSearch, page }],
    queryFn: () => getSuppliers({ search: debouncedSearch || undefined, page }),
    placeholderData: (prev) => prev,
  })

  // ── Modaux ────────────────────────────────────────────────────────────────
  const [modal, setModal]               = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Supplier | null>(null)

  // ── Formulaire ────────────────────────────────────────────────────────────
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', country: 'SN', phone: '', email: '', address: '', notes: '' },
  })

  useEffect(() => {
    if (modal?.mode === 'edit') {
      reset({
        name:    modal.supplier.name,
        country: modal.supplier.country ?? 'SN',
        phone:   modal.supplier.phone ?? '',
        email:   modal.supplier.email ?? '',
        address: modal.supplier.address ?? '',
        notes:   modal.supplier.notes ?? '',
      })
    } else if (modal?.mode === 'create') {
      reset({ name: '', country: 'SN', phone: '', email: '', address: '', notes: '' })
    }
  }, [modal, reset])

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (v: FormValues) => createSupplier({
      name:    v.name,
      country: v.country,
      phone:   normalizePhone(v.phone),
      email:   v.email || null,
      address: v.address || null,
      notes:   v.notes || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setModal(null); toast.success(t('suppliers.created')) },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ uid, v }: { uid: string; v: FormValues }) => updateSupplier(uid, {
      name:    v.name,
      country: v.country,
      phone:   normalizePhone(v.phone),
      email:   v.email || null,
      address: v.address || null,
      notes:   v.notes || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setModal(null); toast.success(t('suppliers.updated')) },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: (s: Supplier) => updateSupplier(s.uid, { is_active: !s.is_active }),
    onSuccess: (_, s) => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setToggleTarget(null); toast.success(t(s.is_active ? 'suppliers.deactivated' : 'suppliers.activated')) },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => deleteSupplier(uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setDeleteTarget(null); toast.success(t('suppliers.deleted')) },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const onSubmit = (v: FormValues) => {
    if (modal?.mode === 'create') createMutation.mutate(v)
    else if (modal?.mode === 'edit') updateMutation.mutate({ uid: modal.supplier.uid, v })
  }

  const isMutating = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.isError || updateMutation.isError

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: t('common.name'),
      render: (s) => <span className="font-medium text-gray-900">{s.name}</span>,
    },
    {
      key: 'phone',
      header: t('common.phone'),
      render: (s) => <span className={s.phone ? 'text-sm text-gray-700' : 'text-sm text-gray-300'}>{s.phone ?? '—'}</span>,
    },
    {
      key: 'email',
      header: t('common.email'),
      render: (s) => <span className={s.email ? 'text-sm text-gray-700' : 'text-sm text-gray-300'}>{s.email ?? '—'}</span>,
    },
    {
      key: 'is_active',
      header: t('common.status'),
      align: 'center',
      render: (s) => (
        <Badge variant={s.is_active ? 'success' : 'default'}>
          {t(s.is_active ? 'common.active' : 'common.inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <CanDo permission="suppliers.edit">
            <button type="button" onClick={() => setModal({ mode: 'edit', supplier: s })}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title={t('common.edit')}>
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          </CanDo>
          <CanDo permission="suppliers.edit">
            <button type="button" onClick={() => setToggleTarget(s)}
              className={`rounded p-1.5 transition-colors ${s.is_active ? 'text-gray-400 hover:bg-orange-50 hover:text-orange-500' : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
              title={t(s.is_active ? 'common.deactivate' : 'common.activate')}>
              <NoSymbolIcon className="h-4 w-4" />
            </button>
          </CanDo>
          <CanDo permission="suppliers.delete">
            <button type="button" onClick={() => setDeleteTarget(s)}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title={t('common.delete')}>
              <TrashIcon className="h-4 w-4" />
            </button>
          </CanDo>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">{t('suppliers.title')}</h1>
        <CanDo permission="suppliers.create">
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setModal({ mode: 'create' })}>
            {t('suppliers.new')}
          </Button>
        </CanDo>
      </div>

      <div className="max-w-xs">
        <Input placeholder={t('suppliers.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Table<Supplier>
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(s) => s.id}
        loading={isLoading}
        skeletonRows={8}
        onRowClick={(s) => navigate(`/suppliers/${s.uid}`)}
        emptyMessage={<EmptyState icon={<TruckIcon className="h-7 w-7" />} title={t('suppliers.empty_title')} description={t('suppliers.empty_desc')} />}
        mobileCard={(s) => (
          <div className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-gray-900">{s.name}</span>
                <Badge variant={s.is_active ? 'success' : 'default'}>{t(s.is_active ? 'common.active' : 'common.inactive')}</Badge>
              </div>
              {s.phone && <p className="text-xs text-gray-500">{s.phone}</p>}
              {s.email && <p className="text-xs text-gray-400 truncate">{s.email}</p>}
            </div>
            <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <CanDo permission="suppliers.edit">
                <button type="button" onClick={() => setModal({ mode: 'edit', supplier: s })}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
              </CanDo>
              <CanDo permission="suppliers.delete">
                <button type="button" onClick={() => setDeleteTarget(s)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </CanDo>
            </div>
          </div>
        )}
      />

      {data && data.last_page > 1 && (
        <Pagination currentPage={data.current_page} lastPage={data.last_page} total={data.total} perPage={data.per_page} onPageChange={setPage} />
      )}

      {/* Modal création / édition */}
      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? t('suppliers.edit') : t('suppliers.new')}
        size="md"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setModal(null)}>{t('common.cancel')}</Button>
            <Button form={FORM_ID} type="submit" loading={isMutating}>
              {modal?.mode === 'edit' ? t('common.save') : t('common.create')}
            </Button>
          </>
        }
      >
        {mutationError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{t('common.error_generic')}</p>
        )}
        <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <p className="text-xs text-gray-400">
            {t('common.required_fields')}
          </p>
          <Input label={t('common.name')} error={errors.name?.message} required {...register('name')} />
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Controller
                name="country"
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
          <Input label={t('common.email')} type="email" error={errors.email?.message} {...register('email')} />
          <Textarea label={t('common.address')} {...register('address')} />
          <Textarea label={t('common.notes')} {...register('notes')} />
        </form>
      </Modal>

      {/* Modal suppression */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('suppliers.delete_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.uid)}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          {t('suppliers.delete_confirm')} <span className="font-semibold text-gray-900">«{deleteTarget?.name}»</span> ? {t('common.action_irreversible')}
        </p>
      </Modal>

      {/* Modal confirmation activation / désactivation */}
      <Modal
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        title={t(toggleTarget?.is_active ? 'suppliers.deactivate_title' : 'suppliers.activate_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setToggleTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant={toggleTarget?.is_active ? 'danger' : undefined}
              loading={toggleMutation.isPending}
              onClick={() => toggleTarget && toggleMutation.mutate(toggleTarget)}
            >
              {t(toggleTarget?.is_active ? 'common.deactivate' : 'common.activate')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          {t(toggleTarget?.is_active ? 'suppliers.deactivate_confirm' : 'suppliers.activate_confirm')}{' '}
          <span className="font-semibold text-gray-900">«{toggleTarget?.name}»</span> ?
        </p>
      </Modal>
    </div>
  )
}
