import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useShopStore } from '@/shop/store/shopStore'
import { createShopOrder } from '@/shop/services/shop'
import type { CreateOrderResponse } from '@/shop/services/shop'
import { getApiErrorMessage } from '@/lib/errors'

// ── Zod schema étape 1 ────────────────────────────────────────────────────────

const customerSchema = z.object({
  customer_name   : z.string().min(2, 'Nom requis (min 2 caractères)'),
  customer_phone  : z
    .string()
    .min(6, 'Téléphone requis')
    .max(20, 'Numéro trop long'),
  customer_email  : z.string().email('Email invalide').optional().or(z.literal('')),
  customer_address: z.string().min(5, 'Adresse requise (min 5 caractères)'),
})

type CustomerFields = z.infer<typeof customerSchema>

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen  : boolean
  onClose : () => void
}

// ── Indicateur étapes ─────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ['Infos', 'Livraison', 'Paiement']
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((label, i) => {
        const num     = i + 1
        const isPast  = num < current
        const isActive= num === current
        return (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  isPast  ? 'bg-green-500 text-white'
                  : isActive ? 'text-white'
                  : 'bg-gray-200 text-gray-500'
                }`}
                style={isActive ? { backgroundColor: 'var(--shop-primary, #111827)' } : undefined}
              >
                {isPast ? <CheckIcon className="h-4 w-4" /> : num}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 mb-4 mx-1 ${num < current ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Résumé commande ───────────────────────────────────────────────────────────

function OrderSummary({ deliveryFee }: { deliveryFee: number }) {
  const items    = useShopStore((s) => s.items)
  const subtotal = useShopStore((s) => s.subtotal)
  const total    = Math.round(subtotal() + deliveryFee)

  return (
    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
      <p className="text-sm font-semibold text-gray-700 mb-3">Résumé</p>
      {items.map((item, i) => (
        <div key={i} className="flex justify-between text-xs text-gray-600">
          <span className="truncate max-w-[160px]">
            {item.product_name}
            {item.variant_name ? ` · ${item.variant_name}` : ''}
            {!item.is_weight_based ? ` × ${item.quantity}` : ''}
          </span>
          <span className="shrink-0 ml-2 font-medium">
            {Math.round(item.total).toLocaleString('fr-FR')} F
          </span>
        </div>
      ))}
      <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Sous-total</span>
          <span>{Math.round(subtotal()).toLocaleString('fr-FR')} FCFA</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Livraison</span>
            <span>{deliveryFee.toLocaleString('fr-FR')} FCFA</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold pt-1">
          <span>Total</span>
          <span className="text-[var(--shop-primary,#111827)]">
            {total.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function CheckoutModal({ isOpen, onClose }: Props) {
  const { slug = '' }   = useParams<{ slug: string }>()
  const items           = useShopStore((s) => s.items)
  const clearCart       = useShopStore((s) => s.clearCart)
  const shopConfig      = useShopStore((s) => s.shopConfig)

  const [step, setStep]               = useState<1 | 2 | 3 | 4>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [orderResult, setOrderResult] = useState<CreateOrderResponse | null>(null)
  const [deliveryZone, setDeliveryZone] = useState<string | null>(null)
  const [deliveryFee, setDeliveryFee]   = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'whatsapp' | null>(null)

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<CustomerFields>({
    resolver: zodResolver(customerSchema),
  })

  const deliveryZones = shopConfig?.delivery_zones ?? []

  const handleClose = () => {
    setStep(1)
    setError(null)
    setOrderResult(null)
    setDeliveryZone(null)
    setDeliveryFee(0)
    setPaymentMethod(null)
    onClose()
  }

  const goNext = handleSubmit(() => {
    if (step === 1) setStep(2)
  })

  const handleZoneSelect = (zone: { name: string; fee: number }) => {
    setDeliveryZone(zone.name)
    setDeliveryFee(zone.fee)
  }

  const handleConfirm = async () => {
    if (!paymentMethod) return
    setIsSubmitting(true)
    setError(null)

    const fields = getValues()
    try {
      const response = await createShopOrder(slug, {
        customer_name   : fields.customer_name,
        customer_phone  : fields.customer_phone,
        customer_email  : fields.customer_email || undefined,
        customer_address: fields.customer_address,
        delivery_zone   : deliveryZone ?? undefined,
        payment_method  : paymentMethod,
        items           : items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id ?? undefined,
          quantity  : i.quantity,
        })),
      })
      setOrderResult(response)
      clearCart()
      setStep(4)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl flex flex-col max-h-[95vh] overflow-hidden shadow-2xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        {step !== 4 && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <h2 className="font-semibold text-gray-900">
              {step === 1 ? 'Informations client'
                : step === 2 ? 'Livraison'
                : 'Paiement'}
            </h2>
            <button type="button" onClick={handleClose} aria-label="Fermer" className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="sm:flex sm:gap-6 p-5">

            {/* Colonne principale */}
            <div className="flex-1 min-w-0">

              {step !== 4 && <StepIndicator current={step} />}

              {/* ── ÉTAPE 4 — Confirmation ───────────────────────────────── */}
              {step === 4 && orderResult && (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                    <CheckIcon className="h-8 w-8 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Commande confirmée !
                  </h2>
                  <p className="text-sm text-gray-500 mb-1">Référence</p>
                  <p className="text-base font-mono font-semibold text-gray-800 mb-6">
                    {orderResult.order.reference}
                  </p>
                  {orderResult.whatsapp_url && (
                    <a
                      href={orderResult.whatsapp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full max-w-xs flex items-center justify-center gap-2 h-12 rounded-xl text-white font-semibold text-sm bg-[#25D366] hover:opacity-90 transition-opacity mb-3"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Ouvrir WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full max-w-xs h-12 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              )}

              {/* ── ÉTAPE 1 — Infos client ───────────────────────────────── */}
              {step === 1 && (
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom complet <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('customer_name')}
                      type="text"
                      placeholder="Ex: Amadou Diallo"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--shop-primary,#111827)] focus:ring-1 focus:ring-[var(--shop-primary,#111827)] transition-colors"
                    />
                    {errors.customer_name && (
                      <p className="text-xs text-red-500 mt-1">{errors.customer_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('customer_phone')}
                      type="tel"
                      inputMode="numeric"
                      placeholder="Ex: +221 77 123 45 67"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--shop-primary,#111827)] focus:ring-1 focus:ring-[var(--shop-primary,#111827)] transition-colors"
                    />
                    {errors.customer_phone && (
                      <p className="text-xs text-red-500 mt-1">{errors.customer_phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-gray-400 text-xs">(optionnel)</span>
                    </label>
                    <input
                      {...register('customer_email')}
                      type="email"
                      placeholder="Ex: amadou@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--shop-primary,#111827)] focus:ring-1 focus:ring-[var(--shop-primary,#111827)] transition-colors"
                    />
                    {errors.customer_email && (
                      <p className="text-xs text-red-500 mt-1">{errors.customer_email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse de livraison <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('customer_address')}
                      rows={2}
                      placeholder="Ex: Dakar, Plateau, Rue 10 x 11"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none resize-none focus:border-[var(--shop-primary,#111827)] focus:ring-1 focus:ring-[var(--shop-primary,#111827)] transition-colors"
                    />
                    {errors.customer_address && (
                      <p className="text-xs text-red-500 mt-1">{errors.customer_address.message}</p>
                    )}
                  </div>
                </form>
              )}

              {/* ── ÉTAPE 2 — Livraison ──────────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-3">
                  {deliveryZones.length > 0 ? (
                    deliveryZones.map((zone) => {
                      const isSelected = deliveryZone === zone.name
                      return (
                        <button
                          key={zone.name}
                          type="button"
                          onClick={() => handleZoneSelect(zone)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                            isSelected
                              ? 'border-[var(--shop-primary,#111827)] bg-[var(--shop-primary,#111827)]/5'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <span className={`font-medium ${isSelected ? '' : 'text-gray-700'}`}
                            style={isSelected ? { color: 'var(--shop-primary, #111827)' } : undefined}
                          >
                            {zone.name}
                          </span>
                          <span className={`font-semibold ${isSelected ? '' : 'text-gray-900'}`}
                            style={isSelected ? { color: 'var(--shop-primary, #111827)' } : undefined}
                          >
                            {zone.fee === 0 ? 'Gratuit' : `${zone.fee.toLocaleString('fr-FR')} FCFA`}
                          </span>
                        </button>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Livraison à définir avec le vendeur
                    </p>
                  )}
                </div>
              )}

              {/* ── ÉTAPE 3 — Paiement ───────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-3">
                  {(['cod', 'whatsapp'] as const).map((method) => {
                    const isSelected = paymentMethod === method
                    const label      = method === 'cod' ? '🚚 Paiement à la livraison' : '💬 Commander via WhatsApp'
                    const sub        = method === 'cod' ? 'Payez à la réception' : 'Votre commande sur WhatsApp'
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`w-full h-16 flex flex-col items-start justify-center px-5 rounded-2xl border-2 text-sm transition-all ${
                          isSelected
                            ? 'border-[var(--shop-primary,#111827)] bg-[var(--shop-primary,#111827)]/5'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span className={`font-semibold ${isSelected ? '' : 'text-gray-800'}`}
                          style={isSelected ? { color: 'var(--shop-primary, #111827)' } : undefined}
                        >
                          {label}
                        </span>
                        <span className="text-xs text-gray-400 mt-0.5">{sub}</span>
                      </button>
                    )
                  })}

                  <p className="text-xs text-gray-400 text-center pt-1">
                    En confirmant, vous acceptez les conditions de vente du vendeur.
                  </p>

                  {error && (
                    <p className="text-xs text-red-500 text-center bg-red-50 rounded-xl px-4 py-2">
                      {error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Résumé commande desktop (sidebar) ───────────────────────── */}
            {step !== 4 && (
              <div className="hidden sm:block w-56 shrink-0 self-start sticky top-0">
                <OrderSummary deliveryFee={deliveryFee} />
              </div>
            )}
          </div>

          {/* ── Résumé mobile (sous le formulaire) ─────────────────────────── */}
          {step !== 4 && (
            <div className="sm:hidden px-5 pb-3">
              <OrderSummary deliveryFee={deliveryFee} />
            </div>
          )}
        </div>

        {/* ── Footer navigation ───────────────────────────────────────────── */}
        {step !== 4 && (
          <div className="border-t border-gray-100 px-5 py-4 flex gap-3 shrink-0">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="px-5 h-12 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Retour
              </button>
            )}

            {step < 3 && (
              <button
                type="button"
                onClick={step === 1 ? goNext : () => setStep((s) => (s + 1) as 2 | 3)}
                className="flex-1 h-12 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 bg-[var(--shop-primary,#111827)]"
              >
                Suivant
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!paymentMethod || isSubmitting}
                className="flex-1 h-12 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--shop-primary,#111827)]"
              >
                {isSubmitting ? 'Envoi en cours…' : 'Confirmer la commande'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
