import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'

const METHODS = [
  { value: 'cash', label: 'Espèces' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Carte bancaire' },
  { value: 'bank_transfer', label: 'Virement' },
  { value: 'credit', label: 'Crédit client' },
] as const

interface PaymentLine {
  method: string
  amount: string
  reference: string
}

interface Props {
  isOpen: boolean
  total: number
  customerName?: string | null
  onConfirm: (payments: { method: string; amount: number; reference?: string }[]) => Promise<void>
  onClose: () => void
}

export function PaymentModal({ isOpen, total, customerName, onConfirm, onClose }: Props) {
  const [lines, setLines] = useState<PaymentLine[]>([
    { method: 'cash', amount: String(total), reference: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setLines([{ method: 'cash', amount: String(total), reference: '' }])
      setError(null)
    }
  }, [isOpen, total])

  const totalPaid   = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const remaining   = Math.max(0, total - totalPaid)
  const overpaid    = totalPaid - total
  const hasCustomer = !!customerName
  // Paiement partiel autorisé uniquement si un client est sélectionné (dette trackée)
  const canConfirm  = totalPaid > 0 && lines.every((l) => l.method) && (totalPaid >= total || hasCustomer)

  const updateLine = (i: number, patch: Partial<PaymentLine>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const addLine = () =>
    setLines((ls) => [...ls, { method: 'cash', amount: String(remaining || 0), reference: '' }])

  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i))

  const fillExact = (i: number) => {
    const others = lines.reduce(
      (s, l, idx) => s + (idx !== i ? parseFloat(l.amount) || 0 : 0),
      0,
    )
    updateLine(i, { amount: String(Math.max(0, total - others)) })
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      await onConfirm(
        lines
          .filter((l) => parseFloat(l.amount) > 0)
          .map((l) => ({
            method: l.method,
            amount: parseFloat(l.amount),
            ...(l.reference ? { reference: l.reference } : {}),
          })),
      )
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Erreur lors de la création de la vente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Encaissement"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            loading={loading}
          >
            Confirmer la vente
          </Button>
        </div>
      }
    >
      {/* Total */}
      <div className="mb-4 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-indigo-400 uppercase tracking-wide font-medium">
            Total à encaisser
          </p>
          {customerName && <p className="mt-0.5 text-sm text-indigo-600">{customerName}</p>}
        </div>
        <p className="text-2xl font-bold text-indigo-700">{formatCurrency(total)}</p>
      </div>

      {/* Payment lines */}
      <div className="space-y-2.5">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={line.method}
              onChange={(e) => updateLine(i, { method: e.target.value })}
              aria-label="Méthode de paiement"
              className="flex-1 rounded-lg border border-gray-200 py-2 px-2 text-sm text-gray-700 bg-white"
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={line.amount}
              onChange={(e) => updateLine(i, { amount: e.target.value })}
              className="w-32 rounded-lg border border-gray-200 py-2 px-2 text-sm text-right"
              placeholder="0"
            />
            <button
              type="button"
              onClick={() => fillExact(i)}
              className="text-xs text-indigo-500 hover:underline whitespace-nowrap shrink-0"
              title="Montant exact"
            >
              Exact
            </button>
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => removeLine(i)}
                aria-label="Supprimer ce mode de paiement"
                className="text-gray-400 hover:text-red-500 shrink-0"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Remaining / change */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-sm text-gray-500">
          {overpaid > 0 ? 'Monnaie à rendre' : remaining > 0 ? 'Reste à payer' : 'Soldé'}
        </span>
        <span
          className={`text-lg font-bold ${
            remaining > 0 ? 'text-red-500' : overpaid > 0 ? 'text-amber-600' : 'text-green-600'
          }`}
        >
          {remaining > 0
            ? formatCurrency(remaining)
            : overpaid > 0
              ? formatCurrency(overpaid)
              : '✓'}
        </span>
      </div>

      {/* Add payment line */}
      {remaining > 0 && lines.length < 4 && (
        <button
          type="button"
          onClick={addLine}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Ajouter un mode de paiement
        </button>
      )}

      {remaining > 0 && !hasCustomer && (
        <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          Sélectionnez un client pour enregistrer le solde restant comme créance.
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </Modal>
  )
}
