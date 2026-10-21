import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PencilSquareIcon,
  TruckIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { getSupplier, updateSupplier } from '@/services/api/suppliers'
import { getPurchaseOrders } from '@/services/api/purchases'
import PhoneInput, { normalizePhone } from '@/components/ui/PhoneInput'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency, formatDate } from '@/lib/utils'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import type { PurchaseOrderStatus } from '@/types'

const schema = z.object({
  name:    z.string().min(1, 'Le nom est requis').max(200),
  country: z.string().length(2).default('SN'),
  phone:   z.string().optional(),
  email:   z.union([z.literal(''), z.string().email('Email invalide')]).optional(),
  address: z.string().optional(),
  notes:   z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const STATUS_VARIANT: Record<PurchaseOrderStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft:     'default',
  ordered:   'info',
  partial:   'warning',
  received:  'success',
  cancelled: 'danger',
}

const FORM_ID = 'supplier-edit-form'

export default function SupplierDetailPage() {
  const { t } = useTranslation()
  const { uid } = useParams<{ uid: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
    draft:     t('purchases.draft'),
    ordered:   t('purchases.ordered'),
    partial:   t('purchases.partial'),
    received:  t('purchases.received'),
    cancelled: t('purchases.cancelled'),
  }

  const [editOpen, setEditOpen] = useState(false)

  const { data: supplier, isLoading: loadingSupplier } = useQuery({
    queryKey: ['supplier', uid],
    queryFn: () => getSupplier(uid!),
    enabled: !!uid,
  })

  const { data: purchases, isLoading: loadingPurchases } = useQuery({
    queryKey: ['purchases', { supplier_id: supplier?.id }],
    queryFn: () => getPurchaseOrders({ supplier_id: supplier!.id, page: 1 }),
    enabled: !!supplier?.id,
  })

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const openEdit = () => {
    if (!supplier) return
    reset({
      name:    supplier.name,
      country: supplier.country ?? 'SN',
      phone:   supplier.phone ?? '',
      email:   supplier.email ?? '',
      address: supplier.address ?? '',
      notes:   supplier.notes ?? '',
    })
    setEditOpen(true)
  }

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => updateSupplier(uid!, {
      name:    v.name,
      country: v.country,
      phone:   normalizePhone(v.phone),
      email:   v.email || null,
      address: v.address || null,
      notes:   v.notes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier', uid] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setEditOpen(false)
      toast.success(t('suppliers.updated'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  if (loadingSupplier) return <div className="p-6 text-sm text-gray-400">{t('common.loading')}</div>
  if (!supplier) return <div className="p-6 text-sm text-gray-400">{t('suppliers.not_found')}</div>

  const orders = purchases?.data ?? []
  const totalOrders   = purchases?.total ?? 0
  const totalAmount   = orders.reduce((sum, o) => sum + parseFloat(String(o.total_amount ?? 0)), 0)
  const lastOrderDate = orders.length > 0 ? orders[0].created_at : null

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <Breadcrumb items={[{ label: t('suppliers.title'), to: '/suppliers' }, { label: supplier.name }]} />

      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
            <TruckIcon className="h-6 w-6 text-brand-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">{supplier.name}</h1>
              <Badge variant={supplier.is_active ? 'success' : 'default'}>
                {supplier.is_active ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>
            {supplier.phone && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{supplier.phone}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <CanDo permission="suppliers.edit">
            <Button variant="outline" icon={<PencilSquareIcon className="h-4 w-4" />} onClick={openEdit}>
              {t('common.edit')}
            </Button>
          </CanDo>
          <CanDo permission="purchases.create">
            <Button icon={<ShoppingBagIcon className="h-4 w-4" />} onClick={() => navigate('/purchases/new')}>
              {t('suppliers.new_order')}
            </Button>
          </CanDo>
        </div>
      </div>

      {/* Infos + stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Coordonnées */}
        <div className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('suppliers.contact_info')}</p>

          {supplier.phone ? (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <PhoneIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
              <span>{supplier.phone}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
              <PhoneIcon className="h-4 w-4 shrink-0" />
              <span>{t('suppliers.phone_missing')}</span>
            </div>
          )}

          {supplier.email ? (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <EnvelopeIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
              <a href={`mailto:${supplier.email}`} className="hover:underline">{supplier.email}</a>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
              <EnvelopeIcon className="h-4 w-4 shrink-0" />
              <span>{t('suppliers.email_missing')}</span>
            </div>
          )}

          {supplier.address && (
            <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <MapPinIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 mt-0.5" />
              <span className="whitespace-pre-line">{supplier.address}</span>
            </div>
          )}

          {supplier.notes && (
            <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <DocumentTextIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 mt-0.5" />
              <span className="whitespace-pre-line">{supplier.notes}</span>
            </div>
          )}
        </div>

        {/* Statistiques */}
        <div className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('suppliers.stats_section')}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('suppliers.total_orders_label')}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{totalOrders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('suppliers.total_amount_label')}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('suppliers.last_order_label')}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {lastOrderDate ? formatDate(lastOrderDate) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historique des bons de commande */}
      <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        <div className="border-b border-gray-100 dark:border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('suppliers.purchase_history')}</h2>
        </div>

        {loadingPurchases ? (
          <div className="p-6 text-sm text-gray-400 dark:text-gray-500">{t('common.loading')}</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-gray-400 dark:text-gray-500">
            <ShoppingBagIcon className="h-8 w-8" />
            <p className="text-sm">{t('suppliers.no_purchases_for_supplier')}</p>
            <CanDo permission="purchases.create">
              <Button variant="outline" size="sm" onClick={() => navigate('/purchases/new')}>
                {t('suppliers.create_order')}
              </Button>
            </CanDo>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">{t('common.reference')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.date')}</th>
                  <th className="px-4 py-3 font-medium">{t('purchases.delivery_label')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('purchases.articles_count')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('common.total')}</th>
                  <th className="px-4 py-3 text-center font-medium">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors"
                    onClick={() => navigate(`/purchases/${order.uid}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{order.reference}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {order.expected_at ? formatDate(order.expected_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {order.items_count ?? order.items?.length ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                      {order.total_amount != null ? formatCurrency(Number(order.total_amount)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATUS_VARIANT[order.status as PurchaseOrderStatus]}>
                        {STATUS_LABEL[order.status as PurchaseOrderStatus] ?? order.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal édition */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('suppliers.edit')}
        size="md"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
            <Button form={FORM_ID} type="submit" loading={updateMutation.isPending}>{t('common.save')}</Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-3">
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
    </div>
  )
}
