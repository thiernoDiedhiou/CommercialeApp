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

// Couleur par position — indépendante des couleurs tenant
const BADGE_COLORS = [
  // payment
  { rest: 'bg-emerald-50 text-emerald-600', hover: 'group-hover:bg-emerald-600 group-hover:text-white' },
  // quality
  { rest: 'bg-blue-50 text-blue-600',     hover: 'group-hover:bg-blue-600 group-hover:text-white'    },
  // delivery
  { rest: 'bg-violet-50 text-violet-600', hover: 'group-hover:bg-violet-600 group-hover:text-white'  },
  // support
  { rest: 'bg-amber-50 text-amber-600',   hover: 'group-hover:bg-amber-600 group-hover:text-white'   },
]

// ── Badges par défaut ─────────────────────────────────────────────────────────

const DEFAULT_BADGES: TrustBadge[] = [
  { icon: 'payment',  title: 'Paiement sécurisé', subtitle: 'Wave, OM, Cash',        active: true },
  { icon: 'quality',  title: 'Qualité garantie',  subtitle: 'Produits vérifiés',     active: true },
  { icon: 'delivery', title: 'Livraison rapide',  subtitle: 'À votre porte',         active: true },
  { icon: 'support',  title: 'Support client',    subtitle: 'Réponse rapide 7j/7',   active: true },
]

export default function TrustBadges() {
  const shopConfig = useShopStore((s) => s.shopConfig)
  const badges     = (shopConfig?.trust_badges ?? DEFAULT_BADGES).filter((b) => b.active)

  if (badges.length === 0) return null

  return (
    <section className="bg-slate-50 border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`grid gap-4 ${
          badges.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' :
          badges.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
          'grid-cols-2 sm:grid-cols-4'
        }`}>
          {badges.map((b, i) => {
            const color = BADGE_COLORS[i % BADGE_COLORS.length]
            return (
              <div
                key={b.icon}
                className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Icône */}
                <div
                  className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${color.rest} ${color.hover}`}
                >
                  {ICONS[b.icon]}
                </div>

                {/* Texte */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{b.subtitle}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
