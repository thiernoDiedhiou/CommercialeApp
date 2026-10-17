import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import PriceInput from '@/components/ui/PriceInput'
import { formatCurrency } from '@/lib/utils'
import { openSession, closeSession } from '@/services/api/pos'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import type { PosSession } from '@/types'

interface SessionSummary {
  sales_count: number
  total_confirmed: number
  by_payment_method: Record<string, number>
  opening_cash: number
  closing_cash: number
  difference: number
}

const METHOD_LABELS: Record<string, string> = {
  cash:          'Espèces',
  mobile_money:  'Mobile Money',
  card:          'Carte bancaire',
  bank_transfer: 'Virement',
  credit:        'Crédit client',
}

interface Props {
  isOpen: boolean
  mode: 'open' | 'close'
  session?: PosSession | null
  currency?: string
  onOpened: (session: PosSession) => void
  onClosed: () => void
  onClose: () => void
}

export function SessionModal({ isOpen, mode, session, currency = 'XOF', onOpened, onClosed, onClose }: Props) {
  const [cash, setCash]     = useState<number | null>(null)
  const [notes, setNotes]   = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<SessionSummary | null>(null)

  const handleClose = () => {
    setCash(null)
    setNotes('')
    setSummary(null)
    onClose()
  }

  const handleOpen = async () => {
    setLoading(true)
    try {
      const s = await openSession({ opening_cash: cash ?? 0, notes: notes || undefined })
      toast.success('Session ouverte.')
      setCash(null)
      setNotes('')
      onOpened(s)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const handleClose2 = async () => {
    if (!session) return
    setLoading(true)
    try {
      const result = await closeSession(session.id, { closing_cash: cash ?? 0, notes: notes || undefined })
      setSummary(result.summary as SessionSummary)
      toast.success('Session fermée.')
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  // ── Vue résumé post-clôture ────────────────────────────────────────────────
  if (summary) {
    const diff = summary.difference
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => { setSummary(null); onClosed() }}
        title="Résumé de caisse"
        size="sm"
        footer={
          <Button className="w-full" onClick={() => { setSummary(null); onClosed() }}>
            Fermer
          </Button>
        }
      >
        <div className="space-y-4">
          {/* KPI principal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-brand-primary/10 border border-brand-primary/20 p-3 text-center">
              <p className="text-2xl font-bold text-brand-primary">{summary.sales_count}</p>
              <p className="mt-0.5 text-xs text-brand-primary/70">Ventes</p>
            </div>
            <div className="rounded-xl bg-brand-primary/10 border border-brand-primary/20 p-3 text-center">
              <p className="text-lg font-bold text-brand-primary">{formatCurrency(summary.total_confirmed)}</p>
              <p className="mt-0.5 text-xs text-brand-primary/70">Total encaissé</p>
            </div>
          </div>

          {/* Ventilation par mode de paiement */}
          {Object.keys(summary.by_payment_method).length > 0 && (
            <div className="rounded-xl bg-gray-50 p-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Par mode de paiement</p>
              {Object.entries(summary.by_payment_method).map(([method, amount]) => (
                <div key={method} className="flex justify-between text-sm">
                  <span className="text-gray-600">{METHOD_LABELS[method] ?? method}</span>
                  <span className="font-medium text-gray-800">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Caisse */}
          <div className="rounded-xl border border-gray-200 p-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Récapitulatif de caisse</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Mise de caisse initiale</span>
              <span className="text-gray-700">{formatCurrency(summary.opening_cash)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fond de caisse final</span>
              <span className="text-gray-700">{formatCurrency(summary.closing_cash)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-1.5">
              <span className="text-gray-700">Écart</span>
              <span className={diff >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  // ── Vue ouvrir / fermer ────────────────────────────────────────────────────
  const isOpenMode = mode === 'open'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isOpenMode ? 'Ouvrir une session de caisse' : 'Fermer la session de caisse'}
      size="sm"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            className="flex-1"
            variant={isOpenMode ? 'primary' : 'danger'}
            loading={loading}
            onClick={isOpenMode ? handleOpen : handleClose2}
          >
            {isOpenMode ? 'Ouvrir la session' : 'Fermer la session'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {isOpenMode ? (
          <>
            <p className="text-sm text-gray-500">
              Saisissez le montant en espèces présent dans le tiroir-caisse au démarrage.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Mise de caisse initiale
              </label>
              <PriceInput
                value={cash}
                onChange={setCash}
                currency={currency}
                placeholder="0"
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Comptez les espèces dans le tiroir et saisissez le montant. L'écart sera calculé automatiquement.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fond de caisse final (espèces comptées)
              </label>
              <PriceInput
                value={cash}
                onChange={setCash}
                currency={currency}
                placeholder="0"
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optionnel)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={isOpenMode ? "Observations à l'ouverture…" : "Observations à la clôture…"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      </div>
    </Modal>
  )
}
