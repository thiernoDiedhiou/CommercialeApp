import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilSquareIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { getBrands, createBrand, updateBrand, deleteBrand } from '@/services/api/brands'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import EmptyState from '@/components/ui/EmptyState'
import type { Brand } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
})

type FormValues = z.infer<typeof schema>

const FORM_ID = 'brand-form'

type ModalState = { mode: 'create' } | { mode: 'edit'; brand: Brand } | null

export default function BrandsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [modal, setModal]               = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn : getBrands,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver     : zodResolver(schema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (modal?.mode === 'edit') reset({ name: modal.brand.name })
    else if (modal?.mode === 'create') reset({ name: '' })
  }, [modal, reset])

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => createBrand({ name: v.name }),
    onSuccess : () => { qc.invalidateQueries({ queryKey: ['brands'] }); setModal(null); toast.success(t('brands.created')) },
    onError   : (err) => toast.error(getApiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ uid, v }: { uid: string; v: FormValues }) => updateBrand(uid, { name: v.name }),
    onSuccess : () => { qc.invalidateQueries({ queryKey: ['brands'] }); setModal(null); toast.success(t('brands.updated')) },
    onError   : (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => deleteBrand(uid),
    onSuccess : () => { qc.invalidateQueries({ queryKey: ['brands'] }); setDeleteTarget(null); toast.success(t('brands.deleted')) },
    onError   : (err) => toast.error(getApiErrorMessage(err)),
  })

  const onSubmit = (v: FormValues) => {
    if (modal?.mode === 'create') createMutation.mutate(v)
    else if (modal?.mode === 'edit') updateMutation.mutate({ uid: modal.brand.uid, v })
  }

  const isMutating = createMutation.isPending || updateMutation.isPending

  const columns: Column<Brand>[] = [
    {
      key   : 'name',
      header: t('common.name'),
      render: (b) => <span className="font-medium text-gray-900 dark:text-gray-100">{b.name}</span>,
    },
    {
      key   : 'actions',
      header: '',
      align : 'right',
      render: (b) => (
        <div className="flex items-center justify-end gap-1">
          <CanDo permission="products.edit">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setModal({ mode: 'edit', brand: b }) }}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
              title={t('common.edit')}
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          </CanDo>
          <CanDo permission="products.delete">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(b) }}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title={t('common.delete')}
            >
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
        <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">{t('brands.title')}</h1>
        <CanDo permission="products.create">
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setModal({ mode: 'create' })}>
            {t('brands.new')}
          </Button>
        </CanDo>
      </div>

      <Table<Brand>
        columns={columns}
        data={brands}
        keyExtractor={(b) => b.id}
        loading={isLoading}
        skeletonRows={5}
        emptyMessage={<EmptyState icon={<TagIcon className="h-7 w-7" />} title={t('brands.empty_title')} description={t('brands.empty_desc')} />}
        mobileCard={(b) => (
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="font-medium text-gray-900 dark:text-gray-100">{b.name}</span>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <CanDo permission="products.edit">
                <button type="button" onClick={() => setModal({ mode: 'edit', brand: b })}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300">
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
              </CanDo>
              <CanDo permission="products.delete">
                <button type="button" onClick={() => setDeleteTarget(b)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </CanDo>
            </div>
          </div>
        )}
      />

      {/* ── Modal création / édition ── */}
      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? t('brands.edit') : t('brands.new')}
        size="sm"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setModal(null)}>{t('common.cancel')}</Button>
            <Button form={FORM_ID} type="submit" loading={isMutating}>
              {modal?.mode === 'edit' ? t('common.save') : t('common.create')}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input label={t('common.name')} required error={errors.name?.message} {...register('name')} />
        </form>
      </Modal>

      {/* ── Modal suppression ── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('brands.delete_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.uid)}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('brands.delete_confirm')}{' '}
          <span className="font-semibold text-gray-900 dark:text-gray-100">«{deleteTarget?.name}»</span> ?{' '}
          {t('common.action_irreversible')}
        </p>
      </Modal>
    </div>
  )
}
