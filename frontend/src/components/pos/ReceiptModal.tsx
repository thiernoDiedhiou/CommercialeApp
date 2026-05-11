import { CheckCircleIcon, PrinterIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import type { CartItem } from '@/store/cartStore'
import type { Customer } from '@/types'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  mobile_money: 'Mobile Money',
  card: 'Carte bancaire',
  bank_transfer: 'Virement',
  credit: 'Crédit client',
}

export interface SaleReceipt {
  reference: string
  items: CartItem[]
  payments: { method: string; amount: number; reference?: string }[]
  customer: Customer | null
  subtotal: number
  discountAmount: number
  total: number
  note: string
  tenantName: string
  tenantLogoUrl: string | null
  cashierName: string
  soldAt: string
}

interface Props {
  receipt: SaleReceipt | null
  onClose: () => void
}

function buildPrintHTML(r: SaleReceipt): string {
  const rows = r.items
    .map((item) => {
      const label = item.variant
        ? `${item.product.name} — ${item.variant.attribute_summary}`
        : item.product.name
      const qtyLabel =
        item.unit_weight != null
          ? `${item.unit_weight} kg × ${formatCurrency(item.unit_price)}`
          : `${item.quantity} × ${formatCurrency(item.unit_price)}`
      const lineTotal =
        item.unit_weight != null
          ? item.unit_price * item.unit_weight - item.discount
          : item.unit_price * item.quantity - item.discount
      return `<tr>
        <td style="padding:3px 0;font-size:12px;vertical-align:top">${label}</td>
        <td style="padding:3px 0;font-size:11px;text-align:right;vertical-align:top;white-space:nowrap">${qtyLabel}</td>
        <td style="padding:3px 0;font-size:12px;text-align:right;vertical-align:top;padding-left:10px;white-space:nowrap">${formatCurrency(lineTotal)}</td>
      </tr>`
    })
    .join('')

  const paymentRows = r.payments
    .map(
      (p) =>
        `<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:3px">
      <span>${PAYMENT_LABELS[p.method] ?? p.method}${p.reference ? ` (${p.reference})` : ''}</span>
      <span>${formatCurrency(p.amount)}</span>
    </div>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Reçu ${r.reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 16px; color: #111; }
    .center { text-align: center; }
    .logo img { max-height: 56px; max-width: 120px; object-fit: contain; }
    .shop-name { font-size: 16px; font-weight: bold; margin-top: 4px; }
    .dash { border: none; border-top: 1px dashed #aaa; margin: 8px 0; }
    .meta { font-size: 11px; color: #555; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; }
    .total-line { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #aaa; }
    .footer { text-align: center; font-size: 10px; color: #888; margin-top: 12px; }
    @media print { @page { margin: 0; } body { width: 100%; } }
  </style>
</head>
<body>
  <div class="center">
    ${r.tenantLogoUrl ? `<div class="logo"><img src="${r.tenantLogoUrl}" alt="${r.tenantName}"></div>` : ''}
    <div class="shop-name">${r.tenantName}</div>
  </div>
  <hr class="dash">
  <div class="meta">Réf : <strong>${r.reference}</strong></div>
  <div class="meta">Date : ${r.soldAt}</div>
  <div class="meta">Caissier : ${r.cashierName}</div>
  ${r.customer ? `<div class="meta">Client : ${r.customer.name}</div>` : ''}
  <hr class="dash">
  <table><tbody>${rows}</tbody></table>
  <hr class="dash">
  <div style="display:flex;justify-content:space-between;font-size:12px">
    <span>Sous-total</span><span>${formatCurrency(r.subtotal)}</span>
  </div>
  ${
    r.discountAmount > 0
      ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#16a34a;margin-top:3px">
    <span>Remise</span><span>− ${formatCurrency(r.discountAmount)}</span>
  </div>`
      : ''
  }
  <div class="total-line"><span>TOTAL</span><span>${formatCurrency(r.total)}</span></div>
  <hr class="dash">
  <div style="font-size:12px;font-weight:600;margin-bottom:4px">Paiement</div>
  ${paymentRows}
  ${r.note ? `<hr class="dash"><div class="meta">Note : ${r.note}</div>` : ''}
  <hr class="dash">
  <div class="footer">Merci pour votre achat !<br>${r.tenantName}</div>
</body>
</html>`
}

export function ReceiptModal({ receipt, onClose }: Props) {
  if (!receipt) return null

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=400,height=650')
    if (!win) return
    win.document.write(buildPrintHTML(receipt))
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
    }, 300)
  }

  return (
    <Modal
      isOpen={!!receipt}
      onClose={onClose}
      title="Vente confirmée"
      size="sm"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1 gap-1.5" onClick={handlePrint}>
            <PrinterIcon className="h-4 w-4" />
            Reçu
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Nouvelle vente
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 py-3">
        {/* Icône succès */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircleIcon className="h-8 w-8 text-green-600" />
        </div>

        <div className="text-center">
          <p className="text-base font-semibold text-gray-900">Vente enregistrée</p>
          <p className="text-sm text-gray-400 mt-0.5">{receipt.reference}</p>
          {receipt.customer && (
            <p className="text-sm text-gray-600 mt-1">
              Client : <span className="font-medium">{receipt.customer.name}</span>
            </p>
          )}
        </div>

        {/* Résumé articles */}
        <div className="w-full rounded-xl bg-gray-50 px-4 py-3 space-y-1.5">
          {receipt.items.map((item, i) => {
            const label = item.variant
              ? `${item.product.name} — ${item.variant.attribute_summary}`
              : item.product.name
            const lineTotal =
              item.unit_weight != null
                ? item.unit_price * item.unit_weight - item.discount
                : item.unit_price * item.quantity - item.discount
            return (
              <div key={i} className="flex justify-between text-sm text-gray-600">
                <span className="truncate max-w-[190px]">
                  {label}{' '}
                  <span className="text-gray-400 text-xs">
                    ×{item.unit_weight != null ? `${item.unit_weight}kg` : item.quantity}
                  </span>
                </span>
                <span className="font-medium text-gray-800 shrink-0 pl-2">
                  {formatCurrency(lineTotal)}
                </span>
              </div>
            )
          })}
          {receipt.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600 border-t border-gray-200 pt-1.5">
              <span>Remise</span>
              <span>− {formatCurrency(receipt.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-1.5">
            <span>Total</span>
            <span>{formatCurrency(receipt.total)}</span>
          </div>
        </div>

        {/* Moyens de paiement */}
        <div className="w-full space-y-1">
          {receipt.payments.map((p, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-500">
              <span>{PAYMENT_LABELS[p.method] ?? p.method}</span>
              <span>{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
