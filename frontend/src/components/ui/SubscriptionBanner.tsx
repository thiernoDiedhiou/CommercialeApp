import { ExclamationTriangleIcon, XMarkIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPublicSiteSettings } from '@/services/api/public'
import { useAuthStore } from '@/store/authStore'
import type { SubscriptionInfo } from '@/types'

function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin === window.location.origin
  } catch {
    return url.startsWith('/')
  }
}

// Seuil d'alerte : bannière visible si ≤ 7 jours restants
const ALERT_THRESHOLD = 7

interface Props {
  subscription: SubscriptionInfo | null
}

export default function SubscriptionBanner({ subscription }: Props) {
  const [dismissed, setDismissed] = useState(false)
  // Source de vérité : flag posé par axios dès le premier 402 reçu
  const subscriptionExpired = useAuthStore((s) => s.subscriptionExpired)

  const isExpired = subscriptionExpired || (subscription !== null && (
    subscription.status === 'expired' ||
    subscription.status === 'cancelled' ||
    (subscription.days_remaining !== null && subscription.days_remaining < 0)
  ))

  // Charge les contacts DiDi Sphere uniquement si l'abonnement est expiré
  const { data: siteSettings } = useQuery({
    queryKey : ['public-site-settings'],
    queryFn  : getPublicSiteSettings,
    enabled  : isExpired,
    staleTime: 10 * 60 * 1000,
  })

  // ── État expiré — bannière rouge non-dismissable ───────────────────────────
  if (isExpired) {
    const email     = siteSettings?.contact_email
    const whatsapp  = siteSettings?.contact_whatsapp
    const renewalUrl = siteSettings?.renewal_url

    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-3 lg:px-6">
        <div className="flex flex-col gap-2 max-w-screen-xl mx-auto sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <ExclamationTriangleIcon className="h-5 w-5 mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Votre abonnement a expiré.
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                Contactez DiDi Sphere pour renouveler votre accès.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pl-7 sm:pl-0">
            {/* Bouton paiement — interne : ouvre le formulaire de renouvellement directement */}
            {renewalUrl && (
              isInternalUrl(renewalUrl) ? (
                <Link
                  to="/settings?renouveler=1"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Payer maintenant →
                </Link>
              ) : (
                <a
                  href={renewalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Payer maintenant →
                </a>
              )
            )}

            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900 transition-colors"
              >
                <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" />
                {email}
              </a>
            )}

            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900 transition-colors"
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            )}

            {!email && !whatsapp && (
              <span className="text-xs text-red-600">contact@didisphere.shop</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── État expirant bientôt — bannière dismissable (comportement existant) ────
  if (dismissed || !subscription) return null

  const { days_remaining, status, plan_name, billing_cycle } = subscription

  if (days_remaining === null) return null
  if (days_remaining > ALERT_THRESHOLD) return null

  const isUrgent  = days_remaining <= 1
  const isTrial   = billing_cycle === 'trial'

  const bgColor   = isUrgent ? 'bg-red-50 border-red-200'   : 'bg-amber-50 border-amber-200'
  const iconColor = isUrgent ? 'text-red-500'                : 'text-amber-500'
  const textColor = isUrgent ? 'text-red-800'                : 'text-amber-800'
  const subColor  = isUrgent ? 'text-red-600'                : 'text-amber-600'

  const dayLabel = days_remaining === 0
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
