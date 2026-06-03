import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPublicPlans, type PublicPlan } from '@/services/api/public'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'


const FEATURE_LABELS: { key: keyof PublicPlan; label: string }[] = [
  { key: 'feature_pos',           label: 'Caisse POS' },
  { key: 'feature_invoicing',     label: 'Facturation PDF' },
  { key: 'feature_purchases',     label: 'Commandes fournisseurs' },
  { key: 'feature_reports',       label: 'Rapports & analyses' },
  { key: 'feature_shop',          label: 'Boutique en ligne' },
  { key: 'feature_import_csv',    label: 'Import CSV produits' },
  { key: 'feature_stock_alerts',  label: 'Alertes de stock' },
  { key: 'feature_multi_user',    label: 'Multi-utilisateurs & rôles' },
  { key: 'feature_custom_domain', label: 'Domaine personnalisé' },
]

function PlanCard({ plan, yearly, isHighlighted }: { plan: PublicPlan; yearly: boolean; isHighlighted: boolean }) {
  const navigate = useNavigate()
  const monthlyPrice  = parseFloat(plan.price_monthly)
  const yearlyPrice   = plan.price_yearly ? parseFloat(plan.price_yearly) / 12 : null
  const displayPrice  = yearly && yearlyPrice !== null ? yearlyPrice : monthlyPrice
  const isFree        = monthlyPrice === 0

  return (
    <div className={`relative flex flex-col rounded-2xl p-8 transition-all ${
      isHighlighted
        ? 'bg-ds-blue text-white shadow-2xl shadow-ds-blue/30 ring-2 ring-ds-blue'
        : 'bg-white border-2 border-gray-100 hover:border-ds-blue/30'
    }`}>
      {plan.badge && (
        <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-0.5 text-xs font-bold ${
          isHighlighted ? 'bg-ds-green text-white' : 'bg-ds-purple text-white'
        }`}>
          {plan.badge}
        </span>
      )}

      <div>
        <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isHighlighted ? 'text-white/60' : 'text-gray-400'}`}>
          {plan.name}
        </p>
        {plan.tagline && (
          <p className={`text-sm mb-4 ${isHighlighted ? 'text-white/80' : 'text-gray-500'}`}>
            {plan.tagline}
          </p>
        )}

        <div className="flex items-baseline gap-1 mb-1">
          {isFree ? (
            <span className="text-4xl font-extrabold">Gratuit</span>
          ) : (
            <>
              <span className="text-4xl font-extrabold">{Math.round(displayPrice).toLocaleString('fr-FR')}</span>
              <span className={`text-sm ${isHighlighted ? 'text-white/60' : 'text-gray-400'}`}>XOF/mois</span>
            </>
          )}
        </div>

        {yearly && yearlyPrice !== null && !isFree && (
          <p className={`text-xs mb-2 ${isHighlighted ? 'text-ds-green' : 'text-ds-green'}`}>
            Économisez {plan.yearly_discount_pct}% avec l'abonnement annuel
          </p>
        )}

        <p className={`text-xs mb-6 ${isHighlighted ? 'text-white/60' : 'text-gray-400'}`}>
          {plan.trial_days} jours d'essai gratuit
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate('/inscription')}
        className={`w-full rounded-xl py-3 text-sm font-bold transition-all mb-8 ${
          isHighlighted
            ? 'bg-white text-ds-blue hover:bg-gray-50'
            : 'bg-ds-blue text-white hover:bg-ds-blue-dark'
        }`}
      >
        {isFree ? 'Commencer gratuitement' : `Essayer ${plan.trial_days}j gratuit`}
      </button>

      {/* Limites */}
      <div className={`rounded-xl p-4 mb-6 text-sm space-y-1.5 ${isHighlighted ? 'bg-white/10' : 'bg-gray-50'}`}>
        <p className={isHighlighted ? 'text-white/90' : 'text-gray-700'}>
          <span className="font-semibold">{plan.max_users === 9999 ? 'Illimité' : plan.max_users}</span> utilisateur{plan.max_users > 1 ? 's' : ''}
        </p>
        <p className={isHighlighted ? 'text-white/90' : 'text-gray-700'}>
          <span className="font-semibold">{plan.max_products === 9999 ? 'Illimité' : plan.max_products.toLocaleString('fr-FR')}</span> produits
        </p>
        <p className={isHighlighted ? 'text-white/90' : 'text-gray-700'}>
          <span className="font-semibold">{plan.max_monthly_sales === 9999 ? 'Illimité' : plan.max_monthly_sales.toLocaleString('fr-FR')}</span> ventes/mois
        </p>
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-3">
        {FEATURE_LABELS.map(({ key, label }) => {
          const active = Boolean(plan[key])
          return (
            <li key={key} className={`flex items-center gap-3 text-sm ${!active && 'opacity-40'}`}>
              {active
                ? <CheckIcon className="h-4 w-4 shrink-0 text-ds-green" />
                : <XMarkIcon className={`h-4 w-4 shrink-0 ${isHighlighted ? 'text-white/40' : 'text-gray-300'}`} />
              }
              <span className={isHighlighted ? 'text-white/90' : 'text-gray-600'}>{label}</span>
            </li>
          )
        })}
      </ul>

      {/* Features personnalisées */}
      {plan.features && plan.features.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-dashed pt-4 border-white/20">
          {plan.features.map((f) => (
            <li key={f} className={`flex items-start gap-2 text-xs ${isHighlighted ? 'text-white/70' : 'text-gray-500'}`}>
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ds-green" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PricingPlaceholder() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 animate-pulse">
          <div className="h-3 w-16 bg-gray-200 rounded mb-3" />
          <div className="h-10 w-32 bg-gray-200 rounded mb-6" />
          <div className="h-10 w-full bg-gray-100 rounded-xl mb-8" />
          {[...Array(5)].map((_, j) => (
            <div key={j} className="h-3 w-full bg-gray-100 rounded mb-3" />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function PricingPage() {
  const navigate = useNavigate()
  const [yearly, setYearly] = useState(false)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn:  getPublicPlans,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="py-20">

      {/* Header */}
      <div className="mx-auto max-w-3xl px-4 text-center mb-16">
        <span className="inline-block rounded-full bg-ds-blue-light dark:bg-ds-blue/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ds-blue mb-4">
          Tarifs
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
          Des plans pour chaque boutique
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">
          Commencez gratuitement. Évoluez à votre rythme. Annulation à tout moment.
        </p>

        {/* Toggle mensuel/annuel */}
        {plans.some((p) => p.price_yearly) && (
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1.5">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                !yearly ? 'bg-white dark:bg-gray-700 text-ds-blue shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                yearly ? 'bg-white dark:bg-gray-700 text-ds-blue shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Annuel
              <span className="rounded-full bg-ds-green px-2 py-0.5 text-xs font-bold text-white">-20%</span>
            </button>
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="mx-auto max-w-6xl px-4">
        {isLoading ? (
          <PricingPlaceholder />
        ) : plans.length === 0 ? (
          <p className="text-center text-gray-400 py-20">Aucun plan disponible pour le moment.</p>
        ) : (
          <div className={`grid grid-cols-1 gap-6 ${
            plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' :
            plans.length === 3 ? 'md:grid-cols-3 max-w-5xl mx-auto' :
            'md:grid-cols-4'
          }`}>
            {plans.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                yearly={yearly}
                isHighlighted={plans.length >= 2 && i === Math.floor(plans.length / 2)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAQ courte */}
      <div className="mx-auto max-w-3xl px-4 mt-20">
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white text-center mb-10">Questions fréquentes</h2>
        <div className="space-y-6">
          {[
            {
              q: "L'essai gratuit nécessite-t-il une carte bancaire ?",
              a: "Non. Aucune information de paiement n'est requise pour démarrer votre essai."
            },
            {
              q: "Puis-je changer de plan à tout moment ?",
              a: "Oui. Vous pouvez passer à un plan supérieur ou inférieur à tout moment depuis votre espace client."
            },
            {
              q: "Mes données sont-elles sécurisées ?",
              a: "Oui. Vos données sont isolées dans un espace dédié (multi-tenant), hébergées sur des serveurs sécurisés."
            },
            {
              q: "Comment fonctionne le paiement ?",
              a: "Nous acceptons Orange Money, Wave et les virements bancaires. Facturation mensuelle ou annuelle selon votre choix."
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <p className="font-semibold text-gray-900 dark:text-white mb-2">{q}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto max-w-3xl px-4 mt-16 text-center">
        <div className="rounded-2xl bg-gray-950 p-10 text-white">
          <h2 className="text-2xl font-extrabold mb-3">Vous hésitez encore ?</h2>
          <p className="text-gray-400 mb-6">
            Essayez DiDi Sphere gratuitement — si ce n'est pas pour vous, vous ne payez rien.
          </p>
          <button
            type="button"
            onClick={() => navigate('/inscription')}
            className="rounded-xl bg-ds-blue px-8 py-3 text-sm font-bold text-white hover:bg-ds-blue-dark transition-all"
          >
            Démarrer l'essai gratuit →
          </button>
        </div>
      </div>

    </div>
  )
}
