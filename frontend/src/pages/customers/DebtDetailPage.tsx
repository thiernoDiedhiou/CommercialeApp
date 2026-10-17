import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { getDebtDetail } from '@/services/api/customers'
import { addPayment } from '@/services/api/sales'
import { SkeletonCard } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Select } from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from '@/store/toastStore'
import type { DebtSale } from '@/types'

export default function DebtDetailPage() {
  const { t } = useTranslation()
  const { uid } = useParams<{ uid: string }>()
  const navigate  = useNavigate()
  const qc        = useQueryClient()

  const PAYMENT_METHODS = [
    { value: 'cash',         label: t('sales.method_cash') },
    { value: 'wave',         label: 'Wave' },
    { value: 'orange_money', label: 'Orange Money' },
    { value: 'free_money',   label: 'Free Money' },
    { value: 'bank',         label: t('sales.method_bank_transfer') },
    { value: 'cheque',       label: t('sales.method_cheque') },
    { value: 'other',        label: t('common.other') },
  ]

  // Paiement modal
  const [payOpen,    setPayOpen]    = useState(false)
  const [payingSale, setPayingSale] = useState<DebtSale | null>(null)
  const [payAmount,  setPayAmount]  = useState('')
  const [payMethod,  setPayMethod]  = useState('cash')
  const [payRef,     setPayRef]     = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['debt-detail', uid],
    queryFn:  () => getDebtDetail(uid!),
    enabled:  !!uid,
  })

  const payMutation = useMutation({
    mutationFn: () => addPayment(payingSale!.uid, {
      method:    payMethod,
      amount:    parseFloat(payAmount) || 0,
      reference: payRef || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debt-detail', uid] })
      qc.invalidateQueries({ queryKey: ['debts'] })
      setPayOpen(false)
      setPayAmount('')
      setPayRef('')
      toast.success(t('customers.payment_registered'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const openPayModal = (sale: DebtSale) => {
    setPayingSale(sale)
    setPayAmount(String(Math.round(sale.remaining)))
    setPayMethod('cash')
    setPayRef('')
    setPayOpen(true)
  }

  const buildWhatsApp = () => {
    if (!data) return ''
    const { customer, sales, total_outstanding } = data
    const lines = sales.map(
      (s) => `  • ${s.reference} du ${formatDate(s.sale_date)} : ${formatCurrency(s.remaining)} restant`
    ).join('\n')
    const msg = `Bonjour ${customer.name},\n\nNous vous rappelons que vous avez un solde impayé de *${formatCurrency(total_outstanding)}* :\n\n${lines}\n\nMerci de régulariser votre situation dès que possible.\n\nCordialement.`
    const phone = customer.phone?.replace(/\D/g, '') ?? ''
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  if (isLoading) return <div className="p-6"><SkeletonCard /></div>
  if (!data)     return null

  const { customer, sales, total_outstanding, unpaid_count } = data

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/debts')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('nav.debts')}
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-800">{customer.name}</span>
      </div>

      {/* Carte client + solde */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600 select-none">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="h-3.5 w-3.5" />
                    {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <EnvelopeIcon className="h-3.5 w-3.5" />
                    {customer.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/customers/${customer.uid}`}
              className="text-sm text-brand-primary hover:underline"
            >
              {t('customers.view_client_file')}
            </Link>

            {customer.phone && (
              <a
                href={buildWhatsApp()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
              >
                <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                {t('customers.whatsapp_remind')}
              </a>
            )}
          </div>
        </div>

        {/* KPIs solde */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-xs text-red-400 uppercase tracking-wide">{t('customers.total_due')}</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(total_outstanding)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{t('customers.unpaid_sales')}</p>
            <p className="mt-1 text-2xl font-bold text-gray-700">{unpaid_count}</p>
          </div>
        </div>
      </div>

      {/* Liste des ventes impayées */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          <h2 className="font-semibold text-gray-900">{t('customers.unpaid_sales_section')}</h2>
        </div>

        {/* ── Cartes mobiles ── */}
        <div className="sm:hidden divide-y divide-gray-100">
          {sales.map((sale) => (
            <div key={sale.uid} className="px-4 py-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    to={`/sales/${sale.uid}`}
                    className="font-mono font-semibold text-brand-primary hover:underline text-sm"
                  >
                    {sale.reference}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(sale.sale_date)}</p>
                </div>
                <span className="shrink-0 text-base font-bold text-red-600">
                  {formatCurrency(sale.remaining)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-gray-400 uppercase tracking-wide">{t('customers.sale_total')}</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{formatCurrency(sale.total)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-2">
                  <p className="text-emerald-400 uppercase tracking-wide">{t('customers.already_paid')}</p>
                  <p className="font-semibold text-emerald-700 mt-0.5">{formatCurrency(sale.paid_amount)}</p>
                </div>
              </div>
              <CanDo permission="sales.edit">
                <button
                  type="button"
                  onClick={() => openPayModal(sale)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  <BanknotesIcon className="h-4 w-4" />
                  {t('customers.collect')} {formatCurrency(sale.remaining)}
                </button>
              </CanDo>
            </div>
          ))}
          {/* Total mobile */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t-2 border-gray-200">
            <span className="text-sm font-semibold text-gray-700">{t('customers.total_remaining_due')}</span>
            <span className="font-bold text-red-600 text-base">{formatCurrency(total_outstanding)}</span>
          </div>
        </div>

        {/* ── Tableau desktop ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{t('common.reference')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{t('common.date')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">{t('common.total')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">{t('sales.paid')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">{t('customers.remaining_due')}</th>
                <th className="sr-only">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.map((sale) => (
                <tr key={sale.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      to={`/sales/${sale.uid}`}
                      className="font-mono font-semibold text-brand-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {sale.reference}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(sale.sale_date)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{formatCurrency(sale.total)}</td>
                  <td className="px-5 py-3 text-right text-emerald-600 font-medium">{formatCurrency(sale.paid_amount)}</td>
                  <td className="px-5 py-3 text-right font-bold text-red-600">{formatCurrency(sale.remaining)}</td>
                  <td className="px-5 py-3 text-right">
                    <CanDo permission="sales.edit">
                      <button
                        type="button"
                        onClick={() => openPayModal(sale)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
                      >
                        <BanknotesIcon className="h-3.5 w-3.5" />
                        {t('customers.collect')}
                      </button>
                    </CanDo>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={4} className="px-5 py-3 text-right text-sm font-semibold text-gray-700">
                  {t('customers.total_remaining_due')}
                </td>
                <td className="px-5 py-3 text-right font-bold text-red-600 text-base">
                  {formatCurrency(total_outstanding)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal encaissement */}
      <Modal
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        title={t('customers.collect_payment_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPayOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => payMutation.mutate()}
              loading={payMutation.isPending}
              disabled={!payAmount || parseFloat(payAmount) <= 0}
            >
              {t('common.validate')}
            </Button>
          </>
        }
      >
        {payingSale && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium text-gray-800">{payingSale.reference}</p>
              <p className="text-gray-500 mt-0.5">{t('customers.remaining_due')} : <span className="font-bold text-red-600">{formatCurrency(payingSale.remaining)}</span></p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('customers.amount_collected')}</label>
              <input
                type="number"
                min="1"
                max={payingSale.remaining}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder={t('common.amount')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.payment_method')}</label>
              <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('customers.reference_optional')}</label>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder={t('customers.reference_placeholder')}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
