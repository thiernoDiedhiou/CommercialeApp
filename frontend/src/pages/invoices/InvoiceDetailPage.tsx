import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Pencil, Download, SendHorizonal, XCircle, Banknote,
  Copy, RefreshCw, FileText, Bell, ChevronDown, ChevronUp,
} from 'lucide-react'
import Breadcrumb from '@/components/ui/Breadcrumb'
import {
  getInvoice, sendInvoice, cancelInvoice, recordInvoicePayment,
  openInvoicePdf, duplicateInvoice, convertQuoteToInvoice,
  createCreditNote, sendInvoiceReminder,
} from '@/services/api/invoices'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InvoiceStatus, PaymentMethod } from '@/types'
import { PAYMENT_METHOD_LABELS } from '@/types'

// ── Icône WhatsApp ────────────────────────────────────────────────────────────
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

// ── Statuts ───────────────────────────────────────────────────────────────────
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
  const { uid } = useParams<{ uid: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', uid],
    queryFn: () => getInvoice(uid!),
  })

  // ── États des modals ──────────────────────────────────────────────────────
  const [showSendModal,     setShowSendModal]     = useState(false)
  const [showPaymentModal,  setShowPaymentModal]  = useState(false)
  const [showCancel,        setShowCancel]        = useState(false)
  const [showConvertModal,  setShowConvertModal]  = useState(false)
  const [showCreditModal,   setShowCreditModal]   = useState(false)
  const [showPayHistory,    setShowPayHistory]    = useState(false)
  const [pdfLoading,        setPdfLoading]        = useState(false)

  // ── Champs email ──────────────────────────────────────────────────────────
  const [sendEmail,   setSendEmail]   = useState('')
  const [sendSubject, setSendSubject] = useState('')
  const [sendMessage, setSendMessage] = useState('')

  // ── Champs paiement ───────────────────────────────────────────────────────
  const [payAmount,    setPayAmount]    = useState('')
  const [payMethod,    setPayMethod]    = useState<PaymentMethod>('cash')
  const [payDate,      setPayDate]      = useState('')
  const [payRef,       setPayRef]       = useState('')
  const [payNote,      setPayNote]      = useState('')

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['invoice', uid] })
    qc.invalidateQueries({ queryKey: ['invoices'] })
  }

  const sendMutation = useMutation({
    mutationFn: () => sendInvoice(uid!, {
      email:   sendEmail   || undefined,
      subject: sendSubject || undefined,
      message: sendMessage || undefined,
    }),
    onSuccess: () => {
      invalidate()
      setShowSendModal(false)
      setSendEmail(''); setSendSubject(''); setSendMessage('')
      toast.success('Document envoyé et marqué comme envoyé.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelInvoice(uid!),
    onSuccess: () => { invalidate(); setShowCancel(false); toast.success('Facture annulée.') },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const paymentMutation = useMutation({
    mutationFn: () => recordInvoicePayment(uid!, {
      amount:    parseFloat(payAmount) || 0,
      method:    payMethod,
      paid_at:   payDate || undefined,
      reference: payRef  || undefined,
      note:      payNote || undefined,
    }),
    onSuccess: () => {
      invalidate()
      setShowPaymentModal(false)
      setPayAmount(''); setPayMethod('cash'); setPayDate(''); setPayRef(''); setPayNote('')
      toast.success('Paiement enregistré.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateInvoice(uid!),
    onSuccess: (copy) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success(`Copie créée : ${copy.reference}`)
      navigate(`/invoices/${copy.uid}`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const convertMutation = useMutation({
    mutationFn: () => convertQuoteToInvoice(uid!),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setShowConvertModal(false)
      toast.success(`Facture ${inv.reference} créée.`)
      navigate(`/invoices/${inv.uid}`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const creditNoteMutation = useMutation({
    mutationFn: () => createCreditNote(uid!),
    onSuccess: (cn) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setShowCreditModal(false)
      toast.success(`Avoir ${cn.reference} créé.`)
      navigate(`/invoices/${cn.uid}`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const reminderMutation = useMutation({
    mutationFn: () => sendInvoiceReminder(uid!),
    onSuccess: (updated) => {
      invalidate()
      toast.success(`Relance n°${updated.reminder_count} envoyée par email.`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handlePdf = async () => {
    setPdfLoading(true)
    try { await openInvoicePdf(uid!, invoice?.reference) } finally { setPdfLoading(false) }
  }

  const buildWhatsAppUrl = () => {
    const phone = invoice?.customer?.phone?.replace(/\D/g, '') ?? ''
    const isQuote = invoice?.type === 'quote'
    const label = isQuote ? 'devis' : 'facture'
    const lines = [
      `Bonjour ${invoice?.customer?.name ?? ''},`,
      ``,
      `Veuillez trouver ci-dessous le récapitulatif de votre ${label} :`,
      ``,
      `📄 Référence : ${invoice?.reference}`,
      `💰 Montant total : ${formatCurrency(invoice?.total ?? '0')}`,
      invoice?.due_date ? `📅 Échéance : ${formatDate(invoice.due_date)}` : '',
      ``,
      `Merci pour votre confiance.`,
    ].filter(Boolean).join('\n')
    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/'
    return `${base}?text=${encodeURIComponent(lines)}`
  }

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Chargement…</div>
  if (!invoice)  return <div className="p-6 text-sm text-gray-400">Document introuvable.</div>

  const amountDue    = Math.max(0, parseFloat(invoice.total) - parseFloat(invoice.paid_amount))
  const isQuote      = invoice.type === 'quote'
  const isCreditNote = !!invoice.credit_note_for_id
  const docLabel     = isQuote ? 'Devis' : isCreditNote ? 'Avoir' : 'Facture'

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      {/* Fil d'Ariane */}
      <Breadcrumb items={[{ label: 'Factures', to: '/invoices' }, { label: invoice.reference }]} />

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-mono text-xl font-bold text-slate-900">{invoice.reference}</h1>
            {isQuote && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                Devis
              </span>
            )}
            {invoice.credit_note_for && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Avoir
              </span>
            )}
            <Badge variant={STATUS_VARIANT[invoice.status]}>{STATUS_LABEL[invoice.status]}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {invoice.customer ? invoice.customer.name : 'Sans client'}
            {' · '}Émise le {formatDate(invoice.issue_date)}
            {invoice.due_date && ` · Échéance le ${formatDate(invoice.due_date)}`}
          </p>
          {/* Lien vers document lié */}
          {invoice.credit_note_for && (
            <p className="mt-0.5 text-xs text-gray-400">
              Avoir relatif à{' '}
              <button type="button" className="text-indigo-600 hover:underline"
                onClick={() => navigate(`/invoices/${invoice.credit_note_for!.uid}`)}>
                {invoice.credit_note_for.reference}
              </button>
            </p>
          )}
          {invoice.converted_to && (
            <p className="mt-0.5 text-xs text-gray-400">
              Converti en{' '}
              <button type="button" className="text-indigo-600 hover:underline"
                onClick={() => navigate(`/invoices/${invoice.converted_to!.uid}`)}>
                {invoice.converted_to.reference}
              </button>
            </p>
          )}
          {invoice.reminder_count > 0 && (
            <p className="mt-0.5 text-xs text-amber-600">
              {invoice.reminder_count} relance{invoice.reminder_count > 1 ? 's' : ''} envoyée{invoice.reminder_count > 1 ? 's' : ''}
              {invoice.last_reminder_at ? ` · dernière le ${formatDate(invoice.last_reminder_at)}` : ''}
            </p>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-wrap gap-2">
          {invoice.status === 'draft' && (
            <CanDo permission="invoices.edit">
              <Button variant="outline" icon={<Pencil className="h-4 w-4" />}
                onClick={() => navigate(`/invoices/${uid}/edit`)}>
                Modifier
              </Button>
            </CanDo>
          )}

          <CanDo permission="invoices.pdf">
            <Button variant="outline" icon={<Download className="h-4 w-4" />}
              loading={pdfLoading} onClick={handlePdf}>
              PDF
            </Button>
          </CanDo>

          {invoice.status !== 'cancelled' && (
            <a href={buildWhatsAppUrl()} target="_blank" rel="noopener noreferrer"
              title={invoice.customer?.phone ? `WhatsApp (${invoice.customer.phone})` : 'Partager via WhatsApp'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition">
              <WhatsAppIcon className="h-4 w-4" />
              WhatsApp
            </a>
          )}

          {/* Dupliquer */}
          <CanDo permission="invoices.create">
            <Button variant="outline" icon={<Copy className="h-4 w-4" />}
              loading={duplicateMutation.isPending}
              onClick={() => duplicateMutation.mutate()}>
              Dupliquer
            </Button>
          </CanDo>

          {/* Envoyer (draft) */}
          {invoice.status === 'draft' && (
            <CanDo permission="invoices.edit">
              <Button icon={<SendHorizonal className="h-4 w-4" />}
                onClick={() => {
                  setSendEmail(invoice.customer?.email ?? '')
                  setShowSendModal(true)
                }}>
                Envoyer
              </Button>
            </CanDo>
          )}

          {/* Convertir devis → facture */}
          {isQuote && !invoice.converted_to_id && ['draft', 'sent'].includes(invoice.status) && (
            <CanDo permission="invoices.create">
              <Button icon={<RefreshCw className="h-4 w-4" />}
                onClick={() => setShowConvertModal(true)}>
                Convertir en facture
              </Button>
            </CanDo>
          )}

          {/* Encaisser */}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && amountDue > 0 && !isQuote && (
            <CanDo permission="invoices.edit">
              <Button icon={<Banknote className="h-4 w-4" />}
                onClick={() => setShowPaymentModal(true)}>
                Encaisser
              </Button>
            </CanDo>
          )}

          {/* Relance */}
          {['sent', 'overdue'].includes(invoice.status) && !isQuote && (
            <CanDo permission="invoices.edit">
              <Button variant="outline" icon={<Bell className="h-4 w-4" />}
                loading={reminderMutation.isPending}
                onClick={() => reminderMutation.mutate()}>
                Relancer
              </Button>
            </CanDo>
          )}

          {/* Avoir */}
          {invoice.status === 'paid' && !isQuote && (
            <CanDo permission="invoices.create">
              <Button variant="outline" icon={<FileText className="h-4 w-4" />}
                onClick={() => setShowCreditModal(true)}>
                Créer un avoir
              </Button>
            </CanDo>
          )}

          {/* Annuler */}
          {['draft', 'sent', 'overdue'].includes(invoice.status) && (
            <CanDo permission="invoices.edit">
              <Button variant="danger" icon={<XCircle className="h-4 w-4" />}
                onClick={() => setShowCancel(true)}>
                Annuler
              </Button>
            </CanDo>
          )}
        </div>
      </div>

      {/* ── Lignes ──────────────────────────────────────────────────────────── */}
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
              <span>Sous-total</span><span>{formatCurrency(invoice.subtotal)}</span>
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
              <span>Total</span><span>{formatCurrency(invoice.total)}</span>
            </div>
            {parseFloat(invoice.paid_amount) > 0 && (
              <div className="flex justify-between font-medium text-emerald-600">
                <span>Encaissé</span><span>{formatCurrency(invoice.paid_amount)}</span>
              </div>
            )}
            {amountDue > 0 && invoice.status !== 'cancelled' && !isQuote && (
              <div className={`flex justify-between rounded-lg px-3 py-2 font-semibold ${
                isCreditNote
                  ? 'bg-orange-50 text-orange-600'
                  : 'bg-red-50 text-red-600'
              }`}>
                <span>{isCreditNote ? 'Crédit client' : 'Reste dû'}</span>
                <span>{formatCurrency(amountDue)}</span>
              </div>
            )}
            {invoice.status === 'paid' && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-700">
                {isCreditNote ? 'Avoir intégralement remboursé ✓' : 'Facture intégralement réglée ✓'}
              </div>
            )}
            {invoice.status === 'cancelled' && (
              <div className="rounded-lg bg-gray-100 px-3 py-2 text-center text-sm font-medium text-gray-500">
                {docLabel} annulée — aucun montant dû
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Historique des paiements ────────────────────────────────────────── */}
      {!isQuote && (invoice.payments ?? []).length > 0 && (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPayHistory((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <span className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-gray-400" />
              Historique des paiements
              <span className="text-xs font-normal text-gray-400">
                ({(invoice.payments ?? []).length} encaissement{(invoice.payments ?? []).length > 1 ? 's' : ''})
              </span>
            </span>
            {showPayHistory ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>

          {showPayHistory && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {(invoice.payments ?? []).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-500">
                        {PAYMENT_METHOD_LABELS[payment.method]}
                        {payment.reference && ` · Réf: ${payment.reference}`}
                        {payment.user && ` · ${payment.user.name}`}
                      </p>
                      {payment.note && <p className="text-xs text-gray-400 italic">{payment.note}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{formatDate(payment.paid_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</p>
          <p className="mt-1 text-sm text-gray-700">{invoice.notes}</p>
        </div>
      )}

      {/* ── Modal Envoyer ───────────────────────────────────────────────────── */}
      <Modal isOpen={showSendModal} onClose={() => setShowSendModal(false)}
        title={`Envoyer ${isQuote ? 'le devis' : isCreditNote ? "l'avoir" : 'la facture'}`} size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setShowSendModal(false)}>Annuler</Button>
          <Button loading={sendMutation.isPending} onClick={() => sendMutation.mutate()}>
            <SendHorizonal className="h-4 w-4 mr-1.5" />
            Envoyer
          </Button>
        </>}
      >
        <div className="space-y-3">
          <Input
            label="Destinataire (email)"
            type="email"
            placeholder={invoice.customer?.email ?? 'email@client.com'}
            value={sendEmail}
            onChange={(e) => setSendEmail(e.target.value)}
          />
          <Input
            label="Objet (optionnel)"
            placeholder={`${docLabel} N° ${invoice.reference}`}
            value={sendSubject}
            onChange={(e) => setSendSubject(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (optionnel)
            </label>
            <textarea
              rows={3}
              placeholder="Le message par défaut sera utilisé si vide…"
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>
          <p className="text-xs text-gray-500">Le PDF sera joint automatiquement.</p>
        </div>
      </Modal>

      {/* ── Modal Encaisser ─────────────────────────────────────────────────── */}
      <Modal isOpen={showPaymentModal}
        onClose={() => { setShowPaymentModal(false); setPayAmount('') }}
        title="Enregistrer un paiement" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => { setShowPaymentModal(false); setPayAmount('') }}>Annuler</Button>
          <Button loading={paymentMutation.isPending} onClick={() => paymentMutation.mutate()}>Valider</Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Reste dû : <strong>{formatCurrency(amountDue)}</strong></p>
          <Input label="Montant encaissé (FCFA)" type="number" min={0.01} max={amountDue} step={1}
            value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
            placeholder={String(Math.round(amountDue))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500">
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <Input label="Date de paiement" type="date" value={payDate}
            onChange={(e) => setPayDate(e.target.value)} />
          <Input label="Référence (n° chèque, virement…)" value={payRef}
            onChange={(e) => setPayRef(e.target.value)} placeholder="Optionnel" />
          <Input label="Note interne" value={payNote}
            onChange={(e) => setPayNote(e.target.value)} placeholder="Optionnel" />
        </div>
      </Modal>

      {/* ── Modal Annuler ───────────────────────────────────────────────────── */}
      <Modal isOpen={showCancel} onClose={() => setShowCancel(false)}
        title={`Annuler ${isQuote ? 'le devis' : 'la facture'}`} size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setShowCancel(false)}>Retour</Button>
          <Button variant="danger" loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
            Annuler {isQuote ? 'le devis' : 'la facture'}
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">Voulez-vous annuler ce document ? Cette action ne peut pas être annulée.</p>
      </Modal>

      {/* ── Modal Convertir devis → facture ─────────────────────────────────── */}
      <Modal isOpen={showConvertModal} onClose={() => setShowConvertModal(false)}
        title="Convertir en facture" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setShowConvertModal(false)}>Annuler</Button>
          <Button loading={convertMutation.isPending} onClick={() => convertMutation.mutate()}>
            Convertir en facture
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Une nouvelle facture sera créée avec les mêmes lignes que le devis <strong>{invoice.reference}</strong>.
          Le devis passera en statut "Annulé".
        </p>
      </Modal>

      {/* ── Modal Avoir ─────────────────────────────────────────────────────── */}
      <Modal isOpen={showCreditModal} onClose={() => setShowCreditModal(false)}
        title="Créer un avoir" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setShowCreditModal(false)}>Annuler</Button>
          <Button loading={creditNoteMutation.isPending} onClick={() => creditNoteMutation.mutate()}>
            Créer l'avoir
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Un avoir (<strong>AVO-</strong>) sera créé pour la facture <strong>{invoice.reference}</strong>,
          reprenant les mêmes lignes. L'avoir part en statut brouillon pour que vous puissiez l'ajuster avant envoi.
        </p>
      </Modal>
    </div>
  )
}
