import { useShopStore } from '@/shop/store/shopStore'

const JAKARTA: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" }
const GROTESK: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }

// Icône et couleur associées par mot-clé dans le nom du moyen de paiement
const METHOD_ICON: { test: RegExp; color: string; dot: string }[] = [
  { test: /wave/i,          color: 'text-blue-600',  dot: 'bg-blue-500'    },
  { test: /orange/i,        color: 'text-orange-500', dot: 'bg-orange-500' },
  { test: /moov|mtn/i,      color: 'text-yellow-600', dot: 'bg-yellow-500' },
  { test: /free/i,          color: 'text-red-600',    dot: 'bg-red-500'    },
  { test: /cash|livraison/i,color: 'text-emerald-600', dot: 'bg-emerald-500'},
  { test: /visa|card|carte/i,color: 'text-indigo-600', dot: 'bg-indigo-500'},
]

function getMethod(name: string) {
  return METHOD_ICON.find((m) => m.test.test(name)) ?? { color: 'text-slate-600', dot: 'bg-slate-400' }
}

function formatMethodName(m: string): string {
  return m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Icône carte de paiement SVG simple
function CardIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

const DEFAULT_METHODS = ['Wave', 'Orange Money', 'Moov Money', 'Cash Livraison']

export default function PaymentBar() {
  const shopConfig = useShopStore((s) => s.shopConfig)
  // Priorité : pos_payment_methods (configurés dans Paramètres → Vente & Caisse)
  // Fallback : payment_methods (modes boutique), puis DEFAULT_METHODS
  const methods    = shopConfig?.pos_payment_methods?.length
    ? shopConfig.pos_payment_methods
    : shopConfig?.payment_methods?.length && !shopConfig.payment_methods.every(m => ['cod','whatsapp'].includes(m))
    ? shopConfig.payment_methods
    : DEFAULT_METHODS

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-16">
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

        {/* Texte gauche */}
        <div className="space-y-1.5 max-w-sm">
          <span
            className="block text-[10px] font-bold uppercase tracking-widest"
            style={{ ...JAKARTA, color: 'var(--shop-primary,#006948)' }}
          >
            Moyens de règlement acceptés
          </span>
          <h3
            className="text-lg sm:text-xl font-bold text-slate-900 leading-snug"
            style={{ ...GROTESK, letterSpacing: '-0.01em' }}
          >
            Réglez en toute sérénité
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed" style={JAKARTA}>
            Paiement sécurisé à la livraison ou en ligne — sans commission additionnelle.
          </p>
        </div>

        {/* Chips moyens de paiement */}
        <div className="flex flex-wrap gap-2">
          {methods.map((method) => {
            const m = getMethod(method)
            return (
              <div
                key={method}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${m.dot}`} />
                <span className={`text-sm font-semibold ${m.color}`} style={JAKARTA}>
                  {formatMethodName(method)}
                </span>
              </div>
            )
          })}

          {/* Carte bancaire si pas déjà mentionnée */}
          {!methods.some((m) => /visa|card|carte/i.test(m)) && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
              <CardIcon className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="text-sm font-semibold text-indigo-600" style={JAKARTA}>Carte bancaire</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
