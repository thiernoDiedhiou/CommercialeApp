import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  XCircle,
  CheckCircle,
  Banknote,
  Undo2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { getSale, cancelSale, openSalePdf, addPayment, getReturns } from '@/services/api/sales'
import { SaleReturnModal } from '@/components/sales/SaleReturnModal'
import { SkeletonCard } from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from '@/store/toastStore'
import type { Sale, RefundMethod } from '@/types'
import { useState } from 'react'

const REFUND_BADGE: Record<RefundMethod, 'success' | 'info' | 'default'> = {
  cash:   'success',
  credit: 'info',
  none:   'default',
}

const STATUS_VARIANT: Record<Sale['status'], 'success' | 'default' | 'danger'> = {
  confirmed: 'success',
  draft:     'default',
  cancelled: 'danger',
}

function SummaryRow({
  label,
  value,
  bold,
  color,
}: {
  label: string
  value: string
  bold?: boolean
  color?: string
}) {
  return (
    <div className={`flex justify-between gap-8 text-sm ${bold ? 'font-bold text-base' : ''} ${color ?? 'text-gray-700'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default function SaleDetailPage() {
  const { uid } = useParams<{ uid: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [payMethod, setPayMethod] = useState('cash')
  const [payAmount, setPayAmount] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  const STATUS_LABEL: Record<Sale['status'], string> = {
    confirmed: t('sales.confirmed'),
    draft:     t('sales.draft'),
    cancelled: t('sales.cancelled'),
  }

  const REFUND_LABEL: Record<RefundMethod, string> = {
    cash:   t('returns.refund_cash'),
    credit: t('returns.refund_credit'),
    none:   t('returns.refund_none'),
  }

  const PAYMENT_METHOD_LABEL: Record<string, string> = {
    cash:          t('sales.method_cash'),
    mobile_money:  t('sales.method_mobile_money'),
    card:          t('sales.method_card'),
    bank_transfer: t('sales.method_bank_transfer'),
    cheque:        t('sales.method_cheque'),
    credit:        t('sales.method_credit'),
  }

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', uid],
    queryFn: () => getSale(uid!),
    enabled: !!uid,
  })

  const { data: returnsData } = useQuery({
    queryKey: ['returns', { sale_id: sale?.id }],
    queryFn: () => getReturns({ sale_id: sale!.id }),
    enabled: !!sale?.id,
  })
  const saleReturns = returnsData?.data ?? []

  const cancelMutation = useMutation({
    mutationFn: () => cancelSale(uid!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale', uid] })
      qc.invalidateQueries({ queryKey: ['sales'] })
      setCancelOpen(false)
    },
  })

  const paymentMutation = useMutation({
    mutationFn: () => addPayment(uid!, {
      method: payMethod,
      amount: parseFloat(payAmount) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale', uid] })
      qc.invalidateQueries({ queryKey: ['sales'] })
      setPaymentOpen(false)
      setPayAmount('')
      setPayMethod('cash')
      toast.success(t('sales.payment_recorded'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handlePdf = async () => {
    setPdfLoading(true)
    try { await openSalePdf(uid!, sale?.reference) } finally { setPdfLoading(false) }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="h-6 w-24 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="p-6 text-sm text-gray-500">
        {t('sales.not_found')}{' '}
        <button className="text-brand-primary hover:underline" onClick={() => navigate('/sales')}>
          {t('common.back')}
        </button>
      </div>
    )
  }

  const due = parseFloat(sale.total) - parseFloat(sale.paid_amount)
  const totalPaid = parseFloat(sale.paid_amount)

  return (
    <div className="space-y-6 p-4 sm:p-6">

      <Breadcrumb items={[{ label: t('sales.title'), to: '/sales' }, { label: sale.reference }]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div />

        <div className="flex flex-wrap items-center gap-2">
          <CanDo permission="sales.pdf">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              loading={pdfLoading}
              onClick={handlePdf}
            >
              PDF
            </Button>
          </CanDo>

          {sale.status === 'confirmed' && due > 0 && (
            <CanDo permission="sales.create">
              <Button
                size="sm"
                icon={<Banknote className="h-4 w-4" />}
                onClick={() => { setPayAmount(String(due.toFixed(0))); setPaymentOpen(true) }}
              >
                {t('sales.collect_rest')}
              </Button>
            </CanDo>
          )}

          {sale.status === 'confirmed' && (
            <CanDo permission="sales.edit">
              <Button
                variant="outline"
                size="sm"
                icon={<Undo2 className="h-4 w-4" />}
                onClick={() => setReturnOpen(true)}
              >
                {t('returns.title')}
              </Button>
            </CanDo>
          )}

          {sale.status === 'confirmed' && (
            <CanDo permission="sales.delete">
              <Button
                variant="danger"
                size="sm"
                icon={<XCircle className="h-4 w-4" />}
                onClick={() => setCancelOpen(true)}
              >
                {t('sales.cancel_title')}
              </Button>
            </CanDo>
          )}
        </div>
      </div>

      {/* En-tête vente */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-2xl font-bold text-gray-900">{sale.reference}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>{formatDateTime(sale.confirmed_at ?? sale.created_at)}</span>
              {sale.user && <span>· {t('sales.vendor_label')} {sale.user.name}</span>}
            </div>
            {sale.customer && (
              <div className="mt-2 text-sm">
                <span className="text-gray-500">{t('sales.customer_label')} </span>
                <Link
                  to={`/customers/${sale.customer.uid}`}
                  className="font-medium text-brand-primary hover:underline"
                >
                  {sale.customer.name}
                </Link>
              </div>
            )}
            {sale.note && (
              <p className="mt-2 text-sm italic text-gray-400">{sale.note}</p>
            )}
          </div>
          <Badge variant={STATUS_VARIANT[sale.status]} className="text-sm">
            {STATUS_LABEL[sale.status]}
          </Badge>
        </div>
      </div>

      {/* Lignes de vente */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">{t('sales.items_title')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{t('sales.col_designation')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">{t('sales.col_qty')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">{t('common.unit_price')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">{t('common.discount')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">{t('common.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(sale.items ?? []).map((item) => {
                const designation = [
                  item.product?.name ?? t('sales.deleted_product'),
                  item.variant?.attribute_summary ? `— ${item.variant.attribute_summary}` : '',
                  item.lot?.lot_number ? `(${t('stock.lot_prefix')} ${item.lot.lot_number})` : '',
                ].filter(Boolean).join(' ')

                const qty = item.unit_weight
                  ? `${item.quantity} × ${item.unit_weight} kg`
                  : `${item.quantity}${item.product?.unit ? ' ' + item.product.unit : ''}`

                const hasDiscount = parseFloat(item.discount) > 0

                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-gray-800">{designation}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{qty}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right">
                      {hasDiscount ? (
                        <span className="text-orange-500">−{formatCurrency(item.discount)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Résumé financier + Paiements */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">{t('sales.summary_title')}</h2>
          <div className="space-y-2">
            <SummaryRow label={t('common.subtotal')} value={formatCurrency(sale.subtotal)} />
            {parseFloat(sale.discount_amount) > 0 && (
              <SummaryRow
                label={`${t('common.discount')}${sale.discount_type === 'percent' ? ` (${sale.discount_value}%)` : ''}`}
                value={`−${formatCurrency(sale.discount_amount)}`}
                color="text-orange-500"
              />
            )}
            {parseFloat(sale.tax_amount) > 0 && (
              <SummaryRow label={t('common.tax')} value={formatCurrency(sale.tax_amount)} />
            )}
            <div className="border-t border-gray-100 pt-2">
              <SummaryRow
                label={t('common.total').toUpperCase()}
                value={formatCurrency(sale.total)}
                bold
                color="text-brand-primary"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">{t('sales.payments_title')}</h2>

          {(sale.payments ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">{t('sales.no_payments')}</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {(sale.payments ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(p.paid_at)}</p>
                  </div>
                  <span className="font-medium text-gray-900">{formatCurrency(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('sales.total_paid')}</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('sales.due')}</span>
              {due > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-600">{formatCurrency(due)}</span>
                  {sale.status === 'confirmed' && (
                    <CanDo permission="sales.create">
                      <button
                        type="button"
                        onClick={() => { setPayAmount(String(due.toFixed(0))); setPaymentOpen(true) }}
                        className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
                      >
                        + {t('sales.collect')}
                      </button>
                    </CanDo>
                  )}
                </div>
              ) : (
                <Badge variant="success" dot>
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  {t('sales.paid_off')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal encaissement */}
      <Modal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title={t('sales.collect_modal_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>{t('common.cancel')}</Button>
            <Button
              loading={paymentMutation.isPending}
              disabled={!payAmount || parseFloat(payAmount) <= 0}
              onClick={() => paymentMutation.mutate()}
            >
              {t('sales.collect_confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {t('sales.due')} : <span className="font-bold text-red-600">{formatCurrency(due)}</span>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('common.payment_method')}</label>
            <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option value="cash">{t('sales.method_cash')}</option>
              <option value="mobile_money">{t('sales.method_mobile_money')}</option>
              <option value="card">{t('sales.method_card')}</option>
              <option value="bank_transfer">{t('sales.method_bank_transfer')}</option>
              <option value="credit">{t('sales.method_credit')}</option>
            </Select>
          </div>
          <Input
            label={t('sales.collect_amount')}
            type="number"
            min={1}
            max={due}
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          {parseFloat(payAmount) > due && (
            <p className="text-xs text-amber-600">
              {t('sales.amount_warning', { amount: formatCurrency(due) })}
            </p>
          )}
        </div>
      </Modal>

      {/* Retours associés */}
      {saleReturns.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Undo2 className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">
              {t('sales.returns_section')} ({saleReturns.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-50">
            {saleReturns.map((ret) => (
              <li key={ret.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-gray-900">{ret.reference}</span>
                  <Badge variant={REFUND_BADGE[ret.refund_method]}>
                    {REFUND_LABEL[ret.refund_method]}
                  </Badge>
                  <span className="text-gray-400 text-xs">{formatDateTime(ret.created_at)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 text-xs">{ret.items_count} {t('sales.articles_count')}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(ret.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal retour */}
      {sale.items && (
        <SaleReturnModal
          sale={sale}
          isOpen={returnOpen}
          onClose={() => setReturnOpen(false)}
        />
      )}

      {/* Modal annulation */}
      <Modal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t('sales.cancel_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>{t('common.back')}</Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {t('sales.cancel_confirm_action')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          {t('sales.cancel_title')}{' '}
          <span className="font-mono font-semibold text-gray-900">{sale.reference}</span> ?{' '}
          {t('sales.cancel_confirm_text')}
        </p>
      </Modal>
    </div>
  )
}
