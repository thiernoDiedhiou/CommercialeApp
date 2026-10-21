import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilSquareIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { getCustomer, getCustomerSales, updateCustomer } from '@/services/api/customers'
import { addPayment } from '@/services/api/sales'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/utils'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import CanDo from '@/components/ui/CanDo'
import CustomerForm from '@/components/customers/CustomerForm'
import type { CustomerFormValues } from '@/components/customers/CustomerForm'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Sale } from '@/types'

const FORM_ID = 'customer-detail-form'

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

function formatRelative(date: string | null): string {
  if (!date) return '—'
  const diffMs = new Date(date).getTime() - Date.now()
  const diffDays = Math.round(diffMs / 86_400_000)
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / 3_600_000)
    return rtf.format(diffHours || -1, 'hour')
  }
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day')
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month')
  return rtf.format(Math.round(diffDays / 365), 'year')
}

const STATUS_VARIANT: Record<Sale['status'], 'success' | 'warning' | 'danger'> = {
  confirmed: 'success',
  draft: 'warning',
  cancelled: 'danger',
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="truncate text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
    </div>
  )
}

export default function CustomerDetailPage() {
  const { uid } = useParams<{ uid: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()

  const [salesPage, setSalesPage] = useState(1)
  const [editOpen, setEditOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payingSale, setPayingSale] = useState<Sale | null>(null)
  const [payMethod, setPayMethod] = useState('cash')
  const [payAmount, setPayAmount] = useState('')

  const STATUS_LABEL: Record<Sale['status'], string> = {
    confirmed: t('sales.confirmed'),
    draft: t('sales.draft'),
    cancelled: t('sales.cancelled'),
  }

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', uid],
    queryFn: () => getCustomer(uid!),
    enabled: !!uid,
  })

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['customer-sales', uid, salesPage],
    queryFn: () => getCustomerSales(uid!, { page: salesPage }),
    enabled: !!uid,
    placeholderData: (prev) => prev,
  })

  const { data: allSalesData } = useQuery({
    queryKey: ['customer-sales-all', uid],
    queryFn: () => getCustomerSales(uid!, { page: 1, per_page: 200 }),
    enabled: !!uid && (customer?.outstanding_balance ?? 0) > 0,
  })

  const payMutation = useMutation({
    mutationFn: () => addPayment(payingSale!.uid, {
      method: payMethod,
      amount: parseFloat(payAmount) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', uid] })
      qc.invalidateQueries({ queryKey: ['customer-sales', uid] })
      qc.invalidateQueries({ queryKey: ['debts'] })
      setPayOpen(false)
      setPayAmount('')
      toast.success(t('customers.payment_registered'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const openPayModal = (sale: Sale) => {
    const due = parseFloat(sale.total) - parseFloat(sale.paid_amount)
    setPayingSale(sale)
    setPayAmount(String(Math.round(due)))
    setPayMethod('cash')
    setPayOpen(true)
  }

  const updateMutation = useMutation({
    mutationFn: (values: CustomerFormValues) =>
      updateCustomer(uid!, {
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', uid] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      setEditOpen(false)
    },
  })

  const saleColumns: Column<Sale>[] = [
    {
      key: 'reference',
      header: t('common.reference'),
      render: (s) => (
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{s.reference}</span>
      ),
    },
    {
      key: 'confirmed_at',
      header: t('common.date'),
      render: (s) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(s.confirmed_at ?? s.created_at)}</span>
      ),
    },
    {
      key: 'total',
      header: t('common.amount'),
      align: 'right',
      render: (s) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(s.total)}</span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      render: (s) => (
        <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
      ),
    },
    {
      key: 'paid_amount',
      header: t('sales.paid'),
      align: 'right',
      render: (s) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(s.paid_amount)}</span>
      ),
    },
    {
      key: 'due',
      header: t('sales.due'),
      align: 'right',
      render: (s) => {
        const due = parseFloat(s.total) - parseFloat(s.paid_amount)
        return due > 0 ? (
          <span className="font-semibold text-red-600">{formatCurrency(due)}</span>
        ) : (
          <span className="text-sm text-gray-300">—</span>
        )
      },
    },
  ]

  if (customerLoading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="h-6 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-2 rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">{t('customers.not_found')}</p>
        <Button variant="ghost" onClick={() => navigate('/customers')} className="mt-3">
          {t('common.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('customers.title')}
        </button>
        <CanDo permission="customers.edit">
          <Button
            variant="outline"
            icon={<PencilSquareIcon className="h-4 w-4" />}
            onClick={() => setEditOpen(true)}
          >
            {t('common.edit')}
          </Button>
        </CanDo>
      </div>

      {/* Profil */}
      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-2xl font-bold text-brand-primary select-none">
            {customer.name.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">{customer.name}</h1>
              <Badge variant={customer.is_active ? 'success' : 'default'}>
                {customer.is_active ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
              {customer.phone && (
                <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <PhoneIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <EnvelopeIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                  {customer.email}
                </span>
              )}
              {customer.address && (
                <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <MapPinIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                  {customer.address}
                </span>
              )}
            </div>

            {customer.notes && (
              <p className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 italic">
                {customer.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<BanknotesIcon className="h-5 w-5" />}
          label={t('customers.total_purchases')}
          value={formatCurrency(customer.total_purchases)}
        />
        <KpiCard
          icon={<ShoppingBagIcon className="h-5 w-5" />}
          label={t('customers.sales_count_label')}
          value={String(customer.sales_count)}
          sub={customer.sales_count === 1 ? t('customers.order_singular') : t('customers.order_plural')}
        />
        <KpiCard
          icon={<CalendarDaysIcon className="h-5 w-5" />}
          label={t('customers.last_visit')}
          value={formatRelative(customer.last_purchase_at)}
          sub={customer.last_purchase_at ? formatDate(customer.last_purchase_at) : undefined}
        />
        {customer.outstanding_balance > 0 ? (
          <div className="flex items-center gap-4 rounded-xl bg-red-50 p-5 shadow-sm ring-1 ring-red-100">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <ExclamationCircleIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-red-500">{t('customers.balance_owed')}</p>
              <p className="truncate text-lg font-bold text-red-700">{formatCurrency(customer.outstanding_balance)}</p>
              <p className="text-xs text-red-400">{t('customers.unpaid_count', { count: customer.unpaid_sales_count })}</p>
            </div>
          </div>
        ) : (
          <KpiCard
            icon={<ExclamationCircleIcon className="h-5 w-5" />}
            label={t('customers.balance_owed')}
            value={t('customers.paid_off')}
            sub={t('customers.no_debts')}
          />
        )}
      </div>

      {/* Section Créances */}
      {customer.outstanding_balance > 0 && (
        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-red-100 dark:ring-red-900/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-semibold text-red-700">
                {t('customers.debts_amount', { amount: formatCurrency(customer.outstanding_balance) })}
              </h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('common.reference')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('common.date')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('common.total')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('sales.paid')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('sales.due')}</th>
                  <th className="sr-only">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                {(allSalesData?.data ?? salesData?.data ?? [])
                  .filter((s) => s.status === 'confirmed' && parseFloat(s.total) > parseFloat(s.paid_amount))
                  .map((sale) => {
                    const due = parseFloat(sale.total) - parseFloat(sale.paid_amount)
                    return (
                      <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-gray-100">{sale.reference}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDateTime(sale.confirmed_at ?? sale.created_at)}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(sale.total)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(sale.paid_amount)}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(due)}</td>
                        <td className="px-4 py-3 text-right">
                          <CanDo permission="sales.create">
                            <button
                              type="button"
                              onClick={() => openPayModal(sale)}
                              className="rounded-md bg-brand-primary px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 transition"
                            >
                              {t('customers.collect')}
                            </button>
                          </CanDo>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historique des ventes */}
      <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('customers.sales_history')}</h2>

        <Table<Sale>
          columns={saleColumns}
          data={salesData?.data ?? []}
          keyExtractor={(s) => s.id}
          loading={salesLoading}
          skeletonRows={5}
          emptyMessage={t('customers.no_sales_for_customer')}
          onRowClick={(s) => navigate(`/sales/${s.uid}`)}
        />

        {salesData && salesData.last_page > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={salesData.current_page}
              lastPage={salesData.last_page}
              total={salesData.total}
              perPage={salesData.per_page}
              onPageChange={setSalesPage}
            />
          </div>
        )}
      </div>

      {/* Modal encaissement rapide */}
      <Modal
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        title={t('customers.collect_payment_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPayOpen(false)}>{t('common.cancel')}</Button>
            <Button
              loading={payMutation.isPending}
              disabled={!payAmount || parseFloat(payAmount) <= 0}
              onClick={() => payMutation.mutate()}
            >
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        {payingSale && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
              {t('customers.sale_reference', { ref: payingSale.reference })}
              {' — '}{t('sales.due')} :{' '}
              <span className="font-bold text-red-600">
                {formatCurrency(parseFloat(payingSale.total) - parseFloat(payingSale.paid_amount))}
              </span>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.payment_method')}</label>
              <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="cash">{t('sales.method_cash')}</option>
                <option value="mobile_money">{t('sales.method_mobile_money')}</option>
                <option value="card">{t('sales.method_card')}</option>
                <option value="bank_transfer">{t('sales.method_bank_transfer')}</option>
              </Select>
            </div>
            <Input
              label={t('customers.amount_label')}
              type="number"
              min={1}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
        )}
      </Modal>

      {/* Modal édition */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('customers.edit')}
        size="md"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              form={FORM_ID}
              type="submit"
              loading={updateMutation.isPending}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        {updateMutation.isError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {t('common.error_generic')}
          </p>
        )}
        <CustomerForm
          formId={FORM_ID}
          customer={customer}
          onSubmit={(values) => updateMutation.mutate(values)}
        />
      </Modal>
    </div>
  )
}
