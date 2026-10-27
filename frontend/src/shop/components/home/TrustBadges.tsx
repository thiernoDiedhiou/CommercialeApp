import { useShopStore } from '@/shop/store/shopStore'
import type { TrustBadge } from '@/shop/store/shopStore'

// ── Icônes SVG par type ───────────────────────────────────────────────────────

const ICONS: Record<TrustBadge['icon'], React.ReactNode> = {
  delivery: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  payment: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  quality: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
}

const BADGE_COLORS = [
  { icon: 'bg-emerald-50 text-emerald-600', hover: 'group-hover:bg-emerald-600 group-hover:text-white' },
  { icon: 'bg-blue-50 text-blue-600',       hover: 'group-hover:bg-blue-600 group-hover:text-white'    },
  { icon: 'bg-violet-50 text-violet-600',   hover: 'group-hover:bg-violet-600 group-hover:text-white'  },
  { icon: 'bg-amber-50 text-amber-600',     hover: 'group-hover:bg-amber-600 group-hover:text-white'   },
]

const DEFAULT_BADGES: TrustBadge[] = [
  { icon: 'payment',  title: 'Paiement sécurisé', subtitle: 'Wave, OM, Cash',       active: true },
  { icon: 'quality',  title: 'Qualité garantie',  subtitle: 'Produits vérifiés',    active: true },
  { icon: 'delivery', title: 'Livraison rapide',  subtitle: 'À votre porte',        active: true },
  { icon: 'support',  title: 'Support client',    subtitle: 'Réponse rapide 7j/7',  active: true },
]

export default function TrustBadges() {
  const shopConfig = useShopStore((s) => s.shopConfig)
  const badges     = (shopConfig?.trust_badges ?? DEFAULT_BADGES).filter((b) => b.active)

  if (badges.length === 0) return null

  const cols =
    badges.length <= 2 ? 'sm:grid-cols-2' :
    badges.length === 3 ? 'sm:grid-cols-3' :
    'sm:grid-cols-4'

  return (
    <section
      className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-10"
    >
      {/* ── Mobile : 3 colonnes compactes centrées ─────────────────────────── */}
      <div className={`sm:hidden grid grid-cols-3 gap-2`}>
        {badges.slice(0, 3).map((b, i) => {
          const color = BADGE_COLORS[i % BADGE_COLORS.length]
          return (
            <div
              key={b.icon + i}
              className="group flex flex-col items-center text-center gap-1.5 p-3 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:border-emerald-200 transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${color.icon} ${color.hover}`}>
                {ICONS[b.icon]}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-800 leading-tight">{b.title}</p>
                {b.subtitle && (
                  <p className="text-[9px] text-slate-400 mt-0.5 font-medium leading-tight">{b.subtitle}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Desktop : 4 colonnes horizontales (card avec icône + texte côte à côte) */}
      <div className={`hidden sm:grid gap-4 ${cols}`}>
        {badges.map((b, i) => {
          const color = BADGE_COLORS[i % BADGE_COLORS.length]
          return (
            <div
              key={b.icon + i}
              className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-slate-100 shadow-md hover:shadow-xl transition-all duration-200"
            >
              <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${color.icon} ${color.hover}`}>
                {ICONS[b.icon]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-snug">{b.title}</p>
                {b.subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{b.subtitle}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
