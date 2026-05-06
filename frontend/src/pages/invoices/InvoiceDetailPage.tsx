import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon, PencilSquareIcon, DocumentArrowDownIcon,
  PaperAirplaneIcon, XCircleIcon, BanknotesIcon,
} from '@heroicons/react/24/outline'
import {
  getInvoice, sendInvoice, cancelInvoice,
  recordInvoicePayment, openInvoicePdf,
} from '@/services/api/invoices'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InvoiceStatus } from '@/types'

const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'info' | 'success' | 'danger'> = {
  draft:     'default',
  sent:      'info',
  paid:      'success',
  overdue:   'danger',
  cancelled: 'default',
}
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft:     'Brouillon',
  sent:      'Envoyée',
  paid:      'Payée',
  overdue:   'En retard',
  cancelled: 'Annulée',
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(Number(id)),
  })

  const [showSend, setShowSend]       = useState(false)
  const [showCancel, setShowCancel]   = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [payAmount, setPayAmount]     = useState('')
  const [pdfLoading, setPdfLoading]   = useState(false)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['invoice', id] })
    qc.invalidateQueries({ queryKey: ['invoices'] })
  }

  const sendMutation = useMutation({
    mutationFn: () => sendInvoice(Number(id)),
    onSuccess: () => { invalidate(); setShowSend(false); toast.success('Facture marquée comme envoyée.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
  const cancelMutation = useMutation({
    mutationFn: () => cancelInvoice(Number(id)),
    onSuccess: () => { invalidate(); setShowCancel(false); toast.success('Facture annulée.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
  const paymentMutation = useMutation({
    mutationFn: () => recordInvoicePayment(Number(id), parseFloat(payAmount) || 0),
    onSuccess: () => { invalidate(); setShowPayment(false); setPayAmount(''); toast.success('Paiement enregistré.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handlePdf = async () => {
    setPdfLoading(true)
    try { await openInvoicePdf(Number(id), invoice?.reference) } finally { setPdfLoading(false) }
  }

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Chargement…</div>
  if (!invoice) return <div className="p-6 text-sm text-gray-400">Facture introuvable.</div>

  const amountDue = Math.max(0, parseFloat(invoice.total) - parseFloat(invoice.paid_amount))

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/invoices')}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Retour">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-bold text-gray-900">{invoice.reference}</h1>
              <Badge variant={STATUS_VARIANT[invoice.status]}>{STATUS_LABEL[invoice.status]}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {invoice.customer ? invoice.customer.name : 'Sans client'}
              {' · '}Émise le {formatDate(invoice.issue_date)}
              {invoice.due_date && ` · Échéance le ${formatDate(invoice.due_date)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {invoice.status === 'draft' && (
            <CanDo permission="invoices.edit">
              <Button variant="outline" icon={<PencilSquareIcon className="h-4 w-4" />}
                onClick={() => navigate(`/invoices/${id}/edit`)}>
                Modifier
              </Button>
            </CanDo>
          )}

          <CanDo permission="invoices.pdf">
            <Button variant="outline" icon={<DocumentArrowDownIcon className="h-4 w-4" />}
              loading={pdfLoading} onClick={handlePdf}>
              PDF
            </Button>
          </CanDo>

          {invoice.status === 'draft' && (
            <CanDo permission="invoices.edit">
              <Button icon={<PaperAirplaneIcon className="h-4 w-4" />} onClick={() => setShowSend(true)}>
                Envoyer
              </Button>
            </CanDo>
          )}

          {(invoice.status === 'sent' || invoice.status === 'overdue') && amountDue > 0 && (
            <CanDo permission="invoices.edit">
              <Button icon={<BanknotesIcon className="h-4 w-4" />} onClick={() => setShowPayment(true)}>
                Encaisser
              </Button>
            </CanDo>
          )}

          {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') && (
            <CanDo permission="invoices.edit">
              <Button variant="danger" icon={<XCircleIcon className="h-4 w-4" />} onClick={() => setShowCancel(true)}>
                Annuler
              </Button>
            </CanDo>
          )}
        </div>
      </div>

      {/* Lignes */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Désignation</th>
                <th className="px-4 py-3 text-right font-medium">Qté</th>
                <th className="px-4 py-3 text-right font-medium">Prix unit.</th>
                <th className="px-4 py-3 text-right font-medium">Remise</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(invoice.items ?? []).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.description}</p>
                    {item.product?.name && item.product.name !== item.description && (
                      <p className="text-xs text-gray-400">{item.product.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.unit_price)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {parseFloat(item.discount) > 0 ? formatCurrency(item.discount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="ml-auto w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {parseFloat(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Remise{invoice.discount_type === 'percent' && ` (${invoice.discount_value}%)`}</span>
                <span>−{formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}
            {parseFloat(invoice.tax_amount) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>TVA ({invoice.tax_rate}%)</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            {parseFloat(invoice.paid_amount) > 0 && (
              <div className="flex justify-between font-medium text-emerald-600">
                <span>Encaissé</span>
                <span>{formatCurrency(invoice.paid_amount)}</span>
              </div>
            )}
            {amountDue > 0 && (
              <div className="flex justify-between rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-600">
                <span>Reste dû</span>
                <span>{formatCurrency(amountDue)}</span>
              </div>
            )}
            {invoice.status === 'paid' && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-700">
                Facture intégralement réglée ✓
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</p>
          <p className="mt-1 text-sm text-gray-700">{invoice.notes}</p>
        </div>
      )}

      {/* Modal envoyer */}
      <Modal isOpen={showSend} onClose={() => setShowSend(false)} title="Envoyer la facture" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setShowSend(false)}>Annuler</Button>
          <Button loading={sendMutation.isPending} onClick={() => sendMutation.mutate()}>Marquer comme envoyée</Button>
        </>}
      >
        <p className="text-sm text-gray-600">Le statut passera à "Envoyée". Vous pourrez ensuite enregistrer les paiements.</p>
      </Modal>

      {/* Modal encaisser */}
      <Modal isOpen={showPayment} onClose={() => { setShowPayment(false); setPayAmount('') }}
        title="Enregistrer un paiement" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => { setShowPayment(false); setPayAmount('') }}>Annuler</Button>
          <Button loading={paymentMutation.isPending} onClick={() => paymentMutation.mutate()}>Valider</Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Reste dû : <strong>{formatCurrency(amountDue)}</strong></p>
          <Input
            label="Montant encaissé (FCFA)"
            type="number"
            min={0.01}
            max={amountDue}
            step={1}
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            placeholder={String(Math.round(amountDue))}
          />
        </div>
      </Modal>

      {/* Modal annuler */}
      <Modal isOpen={showCancel} onClose={() => setShowCancel(false)} title="Annuler la facture" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setShowCancel(false)}>Retour</Button>
          <Button variant="danger" loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
            Annuler la facture
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">Voulez-vous annuler cette facture ? Cette action ne peut pas être annulée.</p>
      </Modal>
    </div>
  )
}
