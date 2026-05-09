import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  XCircleIcon,
  CheckCircleIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { getSale, cancelSale, openSalePdf, addPayment } from '@/services/api/sales'
import { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from '@/store/toastStore'
import type { Sale } from '@/types'
import { useState } from 'react'

// ── Constantes ─────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<Sale['status'], 'success' | 'default' | 'danger'> = {
  confirmed: 'success',
  draft:     'default',
  cancelled: 'danger',
}
const STATUS_LABEL: Record<Sale['status'], string> = {
  confirmed: 'Confirmée',
  draft:     'Brouillon',
  cancelled: 'Annulée',
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash:            'Espèces',
  mobile_money:    'Mobile Money',
  card:            'Carte bancaire',
  bank_transfer:   'Virement bancaire',
  cheque:          'Chèque',
  credit:          'Crédit client',
}

function methodLabel(method: string): string {
  return PAYMENT_METHOD_LABEL[method] ?? method
}

// ── Ligne de résumé financier ─────────────────────────────────────────────

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

// ── Page principale ────────────────────────────────────────────────────────

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payMethod, setPayMethod] = useState('cash')
  const [payAmount, setPayAmount] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  // ── Données ───────────────────────────────────────────────────────────────
  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', Number(id)],
    queryFn: () => getSale(Number(id)),
    enabled: !!id,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: () => cancelSale(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale', Number(id)] })
      qc.invalidateQueries({ queryKey: ['sales'] })
      setCancelOpen(false)
    },
  })

  const paymentMutation = useMutation({
    mutationFn: () => addPayment(Number(id), {
      method: payMethod,
      amount: parseFloat(payAmount) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale', Number(id)] })
      qc.invalidateQueries({ queryKey: ['sales'] })
      setPaymentOpen(false)
      setPayAmount('')
      setPayMethod('cash')
      toast.success('Paiement enregistré.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handlePdf = async () => {
    setPdfLoading(true)
    try { await openSalePdf(Number(id)) } finally { setPdfLoading(false) }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="h-6 w-24 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-2 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Vente introuvable.{' '}
        <button className="text-brand-primary hover:underline" onClick={() => navigate('/sales')}>
          Retour
        </button>
      </div>
    )
  }

  const due = parseFloat(sale.total) - parseFloat(sale.paid_amount)
  const totalPaid = parseFloat(sale.paid_amount)

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Barre de navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/sales')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Ventes
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <CanDo permission="sales.pdf">
            <Button
              variant="outline"
              size="sm"
              icon={<DocumentArrowDownIcon className="h-4 w-4" />}
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
                icon={<BanknotesIcon className="h-4 w-4" />}
                onClick={() => { setPayAmount(String(due.toFixed(0))); setPaymentOpen(true) }}
              >
                Encaisser le reste
              </Button>
            </CanDo>
          )}

          {sale.status === 'confirmed' && (
            <CanDo permission="sales.delete">
              <Button
                variant="danger"
                size="sm"
                icon={<XCircleIcon className="h-4 w-4" />}
                onClick={() => setCancelOpen(true)}
              >
                Annuler la vente
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
              {sale.user && <span>· Vendeur : {sale.user.name}</span>}
            </div>
            {sale.customer && (
              <div className="mt-2 text-sm">
                <span className="text-gray-500">Client : </span>
                <Link
                  to={`/customers/${sale.customer.id}`}
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
          <h2 className="text-sm font-semibold text-gray-700">Lignes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Désignation</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qté</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Prix unit.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Remise</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(sale.items ?? []).map((item) => {
                const designation = [
                  item.product?.name ?? 'Produit supprimé',
                  item.variant?.attribute_summary ? `— ${item.variant.attribute_summary}` : '',
                  item.lot?.lot_number ? `(lot ${item.lot.lot_number})` : '',
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

      {/* Résumé financier + Paiements — 2 colonnes sur desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Résumé financier */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Récapitulatif</h2>
          <div className="space-y-2">
            <SummaryRow label="Sous-total" value={formatCurrency(sale.subtotal)} />
            {parseFloat(sale.discount_amount) > 0 && (
              <SummaryRow
                label={`Remise${sale.discount_type === 'percent' ? ` (${sale.discount_value}%)` : ''}`}
                value={`−${formatCurrency(sale.discount_amount)}`}
                color="text-orange-500"
              />
            )}
            {parseFloat(sale.tax_amount) > 0 && (
              <SummaryRow label="Taxes" value={formatCurrency(sale.tax_amount)} />
            )}
            <div className="border-t border-gray-100 pt-2">
              <SummaryRow
                label="TOTAL"
                value={formatCurrency(sale.total)}
                bold
                color="text-brand-primary"
              />
            </div>
          </div>
        </div>

        {/* Paiements */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Paiements</h2>

          {(sale.payments ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">Aucun paiement enregistré.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {(sale.payments ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{methodLabel(p.method)}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(p.paid_at)}</p>
                  </div>
                  <span className="font-medium text-gray-900">{formatCurrency(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Total payé + reste dû */}
          <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total payé</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Reste dû</span>
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
                        + Encaisser
                      </button>
                    </CanDo>
                  )}
                </div>
              ) : (
                <Badge variant="success" dot>
                  <CheckCircleIcon className="mr-1 h-3.5 w-3.5" />
                  Soldé
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal encaissement du reste */}
      <Modal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Encaisser le reste dû"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Annuler</Button>
            <Button
              loading={paymentMutation.isPending}
              disabled={!payAmount || parseFloat(payAmount) <= 0}
              onClick={() => paymentMutation.mutate()}
            >
              Confirmer le paiement
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Reste dû : <span className="font-bold text-red-600">{formatCurrency(due)}</span>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Mode de paiement</label>
            <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option value="cash">Espèces</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Carte bancaire</option>
              <option value="bank_transfer">Virement bancaire</option>
              <option value="credit">Crédit client</option>
            </Select>
          </div>
          <Input
            label="Montant encaissé (FCFA)"
            type="number"
            min={1}
            max={due}
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          {parseFloat(payAmount) > due && (
            <p className="text-xs text-amber-600">
              Le montant dépasse le reste dû ({formatCurrency(due)}). Seul le montant exact sera enregistré.
            </p>
          )}
        </div>
      </Modal>

      {/* Modal annulation */}
      <Modal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Annuler la vente"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Retour</Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Confirmer l'annulation
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Annuler la vente{' '}
          <span className="font-mono font-semibold text-gray-900">{sale.reference}</span> ?
          Le stock sera restitué et cette action est irréversible.
        </p>
      </Modal>
    </div>
  )
}
