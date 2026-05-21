import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from '@/store/toastStore'
import { createSaleReturn } from '@/services/api/sales'
import type { Sale, SaleItem, RefundMethod } from '@/types'

interface ReturnLine {
  saleItem: SaleItem
  maxQty: number
  returnQty: number
  selected: boolean
}

interface Props {
  sale: Sale
  isOpen: boolean
  onClose: () => void
}

const REFUND_LABELS: Record<RefundMethod, string> = {
  cash:   'Remboursement espèces',
  credit: 'Avoir client',
  none:   'Aucun remboursement',
}

function itemLabel(item: SaleItem): string {
  const parts = [item.product?.name ?? `Produit #${item.product_id}`]
  if (item.variant?.attribute_summary) parts.push(`— ${item.variant.attribute_summary}`)
  return parts.join(' ')
}

function itemQty(item: SaleItem): number {
  return item.unit_weight != null ? item.unit_weight : item.quantity
}

function itemUnit(item: SaleItem): string {
  if (item.unit_weight) return 'kg'
  return item.product?.unit ?? 'unité(s)'
}

export function SaleReturnModal({ sale, isOpen, onClose }: Props) {
  const qc = useQueryClient()

  const [lines, setLines] = useState<ReturnLine[]>(() =>
    (sale.items ?? []).map((item) => ({
      saleItem: item,
      maxQty: itemQty(item),
      returnQty: itemQty(item),
      selected: false,
    })),
  )
  const [reason, setReason] = useState('')
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('cash')

  const selectedLines = lines.filter((l) => l.selected && l.returnQty > 0)
  const returnTotal = selectedLines.reduce((sum, l) => {
    return sum + parseFloat(l.saleItem.unit_price) * l.returnQty
  }, 0)

  const mutation = useMutation({
    mutationFn: () =>
      createSaleReturn(sale.id, {
        reason: reason || null,
        refund_method: refundMethod,
        items: selectedLines.map((l) => ({
          sale_item_id: l.saleItem.id,
          quantity: l.returnQty,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale', sale.id] })
      qc.invalidateQueries({ queryKey: ['returns', { sale_id: sale.id }] })
      qc.invalidateQueries({ queryKey: ['returns'] })
      toast.success('Retour enregistré avec succès.')
      handleClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handleClose = () => {
    setLines((sale.items ?? []).map((item) => ({
      saleItem: item,
      maxQty: itemQty(item),
      returnQty: itemQty(item),
      selected: false,
    })))
    setReason('')
    setRefundMethod('cash')
    onClose()
  }

  const toggleLine = (idx: number) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, selected: !l.selected } : l))
  }

  const setQty = (idx: number, val: string) => {
    const parsed = parseFloat(val)
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l
        const qty = isNaN(parsed) ? 0 : Math.min(Math.max(0, parsed), l.maxQty)
        return { ...l, returnQty: qty }
      }),
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Retour / Avoir"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Annuler</Button>
          <Button
            loading={mutation.isPending}
            disabled={selectedLines.length === 0}
            onClick={() => mutation.mutate()}
          >
            Enregistrer le retour
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* Sélection des articles */}
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Articles à retourner</p>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {lines.map((line, idx) => (
              <label
                key={line.saleItem.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  line.selected ? 'bg-brand-primary/5' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={line.selected}
                  onChange={() => toggleLine(idx)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-primary accent-brand-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{itemLabel(line.saleItem)}</p>
                  <p className="text-xs text-gray-400">
                    Vendu : {line.maxQty} {itemUnit(line.saleItem)} · {formatCurrency(line.saleItem.unit_price)}/unité
                  </p>
                </div>
                {line.selected && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={0.001}
                      max={line.maxQty}
                      step={line.saleItem.unit_weight ? 0.001 : 1}
                      value={line.returnQty}
                      onChange={(e) => setQty(idx, e.target.value)}
                      onClick={(e) => e.preventDefault()}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <span className="text-xs text-gray-500">{itemUnit(line.saleItem)}</span>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Méthode de remboursement */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Mode de remboursement
          </label>
          <Select
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
          >
            {(Object.entries(REFUND_LABELS) as [RefundMethod, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>
        </div>

        {/* Motif */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Motif <span className="text-gray-400 font-normal">(facultatif)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Ex: Produit défectueux, mauvaise taille…"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
          />
        </div>

        {/* Récapitulatif */}
        {selectedLines.length > 0 && (
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{selectedLines.length} article(s) retourné(s)</span>
              <span className="font-semibold text-gray-900">{formatCurrency(returnTotal)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {REFUND_LABELS[refundMethod]}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
