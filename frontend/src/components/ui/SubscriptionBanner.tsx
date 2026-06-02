import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import type { SubscriptionInfo } from '@/types'

// Seuil d'alerte : bannière visible si ≤ 7 jours restants
const ALERT_THRESHOLD = 7

interface Props {
  subscription: SubscriptionInfo | null
}

export default function SubscriptionBanner({ subscription }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !subscription) return null

  const { days_remaining, status, plan_name, billing_cycle } = subscription

  // Pas de bannière si l'abonnement est sain (> 7 jours) ou à vie
  if (days_remaining === null) return null
  if (days_remaining > ALERT_THRESHOLD) return null

  // Détermine le niveau d'urgence
  const isUrgent  = days_remaining <= 1
  const isTrial   = billing_cycle === 'trial'

  const bgColor   = isUrgent ? 'bg-red-50 border-red-200'     : 'bg-amber-50 border-amber-200'
  const iconColor = isUrgent ? 'text-red-500'                  : 'text-amber-500'
  const textColor = isUrgent ? 'text-red-800'                  : 'text-amber-800'
  const subColor  = isUrgent ? 'text-red-600'                  : 'text-amber-600'

  const dayLabel  = days_remaining === 0
    ? "expire aujourd'hui"
    : days_remaining === 1
      ? 'expire demain'
      : `expire dans ${days_remaining} jours`

  const message = isTrial
    ? `Votre période d'essai ${dayLabel}.`
    : `Votre abonnement ${plan_name ?? ''} ${dayLabel}.`

  const hint = status === 'trial'
    ? 'Contactez votre administrateur pour activer un abonnement et conserver votre accès.'
    : 'Contactez votre administrateur pour renouveler votre abonnement.'

  return (
    <div className={`border-b ${bgColor} px-4 py-2.5 lg:px-6`}>
      <div className="flex items-start justify-between gap-3 max-w-screen-xl mx-auto">
        <div className="flex items-start gap-2.5">
          <ExclamationTriangleIcon className={`h-4 w-4 mt-0.5 shrink-0 ${iconColor}`} aria-hidden="true" />
          <div>
            <p className={`text-sm font-medium ${textColor}`}>{message}</p>
            <p className={`text-xs ${subColor} mt-0.5`}>{hint}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fermer l'alerte"
          className={`shrink-0 rounded p-0.5 hover:bg-black/10 transition ${iconColor}`}
        >
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
