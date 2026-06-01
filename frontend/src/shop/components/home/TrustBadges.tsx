import { useShopStore } from '@/shop/store/shopStore'
import type { TrustBadge } from '@/shop/store/shopStore'

// ── Icônes SVG par type ───────────────────────────────────────────────────────

const ICONS: Record<TrustBadge['icon'], React.ReactNode> = {
  delivery: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  payment: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  quality: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
}

// ── Badges par défaut (affichés si le tenant n'a pas configuré les siens) ─────

const DEFAULT_BADGES: TrustBadge[] = [
  { icon: 'delivery', title: 'Livraison rapide',  subtitle: 'À votre porte',       active: true },
  { icon: 'payment',  title: 'Paiement sécurisé', subtitle: 'Plusieurs options',   active: true },
  { icon: 'quality',  title: 'Qualité garantie',  subtitle: 'Produits vérifiés',   active: true },
  { icon: 'support',  title: 'Support client',    subtitle: 'Réponse rapide',      active: true },
]

export default function TrustBadges() {
  const shopConfig = useShopStore((s) => s.shopConfig)
  const badges     = (shopConfig?.trust_badges ?? DEFAULT_BADGES).filter((b) => b.active)

  if (badges.length === 0) return null

  return (
    <div className="bg-gray-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {badges.map((b) => (
            <div key={b.icon} className="flex items-center gap-3">
              <div className="shrink-0 h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-[var(--shop-primary,#111827)] shadow-sm">
                {ICONS[b.icon]}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{b.title}</p>
                {b.subtitle && <p className="text-xs text-gray-500">{b.subtitle}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
