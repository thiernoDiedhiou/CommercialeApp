import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPublicPlans } from '@/services/api/public'
import {
  ShoppingCartIcon, CubeIcon, UsersIcon, DocumentTextIcon,
  ChartBarIcon, GlobeAltIcon, CheckIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline'

// ── Données statiques ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: ShoppingCartIcon,
    color: 'bg-ds-blue-light text-ds-blue',
    title: 'Caisse POS',
    desc: 'Encaissez rapidement en boutique ou sur mobile, avec reçu imprimable.',
  },
  {
    icon: CubeIcon,
    color: 'bg-ds-green-light text-ds-green',
    title: 'Gestion des stocks',
    desc: 'Suivez vos produits en temps réel. Alertes automatiques de rupture.',
  },
  {
    icon: UsersIcon,
    color: 'bg-ds-purple-light text-ds-purple',
    title: 'Clients & créances',
    desc: 'Fidélisez vos clients et suivez les paiements différés.',
  },
  {
    icon: DocumentTextIcon,
    color: 'bg-ds-blue-light text-ds-blue',
    title: 'Facturation PDF',
    desc: 'Créez des factures et devis professionnels en quelques secondes.',
  },
  {
    icon: ChartBarIcon,
    color: 'bg-ds-green-light text-ds-green',
    title: 'Rapports & analyses',
    desc: 'Pilotez vos ventes, produits et performances en temps réel.',
  },
  {
    icon: GlobeAltIcon,
    color: 'bg-ds-purple-light text-ds-purple',
    title: 'Boutique en ligne',
    desc: 'Partagez votre catalogue avec un lien. Commandes directes.',
  },
]

const SECTORS = [
  { emoji: '🛒', label: 'Commerce général',        desc: 'Épiceries, supérettes, multiservices' },
  { emoji: '🍽️', label: 'Alimentation & traiteur', desc: 'Restaurants, fast-food, boulangeries' },
  { emoji: '👗', label: 'Mode & prêt-à-porter',    desc: 'Boutiques, friperies, accessoires' },
  { emoji: '💄', label: 'Cosmétique & beauté',      desc: 'Salons, instituts, distribution' },
]

const STATS = [
  { value: '4', label: 'Secteurs supportés',    suffix: '' },
  { value: '21', label: 'Jours d\'essai gratuit', suffix: 'j' },
  { value: '5', label: 'Pays ciblés',            suffix: '+' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: string): string {
  const n = Math.round(parseFloat(price))
  return n.toLocaleString('fr-FR')
}

// ── Composants de section ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-ds-blue-light dark:bg-ds-blue/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ds-blue">
      {children}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate()

  const { data: plans = [] } = useQuery({
    queryKey: ['public-plans'],
    queryFn:  getPublicPlans,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="overflow-hidden">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center bg-[linear-gradient(135deg,#2465ed_0%,#4a2db5_55%,#6e33d8_100%)]">

        {/* Cercles décoratifs */}
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 text-white">
          {/* Badge géo */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur px-4 py-1.5 text-sm mb-8">
            <GlobeAltIcon className="h-4 w-4" />
            Sénégal · Côte d'Ivoire · Mali · Guinée · Burkina Faso
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight max-w-3xl">
            La gestion commerciale{' '}
            <span className="text-ds-green">tout-en-un</span>{' '}
            pour les PME d'Afrique de l'Ouest
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
            Ventes, stocks, clients et factures — tout ce dont votre boutique a besoin,
            en un seul outil. Multi-devises, adapté à votre secteur.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => navigate('/inscription')}
              className="flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-ds-blue shadow-lg hover:bg-gray-50 transition-all hover:scale-105"
            >
              Essai gratuit <ArrowRightIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/tarifs')}
              className="flex items-center gap-2 rounded-xl border-2 border-white/40 bg-white/10 backdrop-blur px-7 py-3.5 text-base font-bold text-white hover:bg-white/20 transition-all"
            >
              Voir les tarifs
            </button>
          </div>

          <p className="mt-5 text-sm text-white/60">
            Aucune carte bancaire requise · 21 jours d'essai gratuit
          </p>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-3 gap-6 text-center">
            {STATS.map(({ value, label, suffix }) => (
              <div key={label}>
                <p className="text-3xl sm:text-4xl font-extrabold text-ds-blue">
                  {value}<span className="text-ds-green">{suffix}</span>
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="fonctionnalites" className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-14">
            <SectionLabel>Fonctionnalités</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Tout ce qu'il faut pour gérer votre boutique
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Des outils pensés pour les réalités du commerce en Afrique de l'Ouest.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${color} mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/fonctionnalites"
              className="inline-flex items-center gap-2 text-ds-blue font-semibold hover:underline"
            >
              Voir toutes les fonctionnalités <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Secteurs ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-14">
            <SectionLabel>Secteurs</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Adapté à votre type de commerce
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              DiDi Sphere s'adapte à votre secteur d'activité avec les outils spécifiques
              à votre métier.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SECTORS.map(({ emoji, label, desc }) => (
              <div key={label}
                className="group relative overflow-hidden rounded-2xl border-2 border-gray-100 dark:border-gray-700 dark:bg-gray-800/50 p-6 hover:border-ds-blue dark:hover:border-ds-blue hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate('/inscription')}
              >
                <div className="text-4xl mb-4">{emoji}</div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
                <div className="mt-4 text-xs font-semibold text-ds-blue opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Commencer <ArrowRightIcon className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-14">
            <SectionLabel>Simple & rapide</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Opérationnel en 3 minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', color: 'text-ds-blue', bg: 'bg-ds-blue', title: 'Créez votre compte', desc: 'Renseignez le nom de votre boutique, votre secteur et vos identifiants. Aucune carte requise.' },
              { step: '02', color: 'text-ds-green', bg: 'bg-ds-green', title: 'Configurez votre boutique', desc: 'Ajoutez vos produits, vos catégories et personnalisez vos couleurs de marque.' },
              { step: '03', color: 'text-ds-purple', bg: 'bg-ds-purple', title: 'Commencez à vendre', desc: 'Encaissez depuis la caisse POS, générez vos factures et suivez vos stocks en temps réel.' },
            ].map(({ step, color, bg, title, desc }) => (
              <div key={step} className="relative flex flex-col items-center text-center md:items-start md:text-left">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${bg} text-white font-extrabold text-lg mb-4`}>
                  {step}
                </div>
                <h3 className={`text-lg font-bold ${color} mb-2`}>{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tarifs aperçu ────────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <section className="py-20 bg-white dark:bg-gray-950">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-14">
              <SectionLabel>Tarifs</SectionLabel>
              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
                Des plans pour chaque étape de votre croissance
              </h2>
              <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
                {plans[0]?.trial_days ?? 21} jours d'essai gratuit sur tous les plans. Sans engagement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {plans.slice(0, 3).map((plan, i) => {
                const isHighlighted = i === 1
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-6 flex flex-col ${
                      isHighlighted
                        ? 'bg-ds-blue text-white shadow-2xl shadow-ds-blue/30 scale-105'
                        : 'bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-ds-blue/30 dark:hover:border-ds-blue/50 transition-colors'
                    }`}
                  >
                    {plan.badge && (
                      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold ${
                        isHighlighted ? 'bg-ds-green text-white' : 'bg-ds-purple text-white'
                      }`}>
                        {plan.badge}
                      </span>
                    )}
                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isHighlighted ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                      {plan.name}
                    </p>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-extrabold">{formatPrice(plan.price_monthly)}</span>
                      <span className={`text-sm ${isHighlighted ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>XOF/mois</span>
                    </div>
                    <p className={`text-sm mb-6 ${isHighlighted ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                      {plan.tagline}
                    </p>
                    {plan.features && (
                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.slice(0, 4).map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm">
                            <CheckIcon className="h-4 w-4 shrink-0 mt-0.5 text-ds-green" />
                            <span className={isHighlighted ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate('/inscription')}
                      className={`mt-auto w-full rounded-xl py-2.5 text-sm font-bold transition-all ${
                        isHighlighted
                          ? 'bg-white text-ds-blue hover:bg-gray-50'
                          : 'bg-ds-blue text-white hover:bg-ds-blue-dark'
                      }`}
                    >
                      Commencer l'essai gratuit
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="mt-10 text-center">
              <Link
                to="/tarifs"
                className="inline-flex items-center gap-2 text-ds-blue font-semibold hover:underline"
              >
                Comparer tous les plans <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA final ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[linear-gradient(135deg,#11b67e,#0d9267)]">
        <div className="mx-auto max-w-3xl px-4 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Prêt à moderniser votre gestion ?
          </h2>
          <p className="text-lg text-white/80 mb-10">
            Rejoignez les PME d'Afrique de l'Ouest qui font confiance à DiDi Sphere
            pour gérer leur commerce au quotidien.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/inscription')}
              className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-ds-green shadow-lg hover:bg-gray-50 transition-all hover:scale-105"
            >
              Créer mon compte gratuit <ArrowRightIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/tarifs')}
              className="flex items-center gap-2 rounded-xl border-2 border-white/40 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-all"
            >
              Voir les tarifs
            </button>
          </div>
          <p className="mt-6 text-sm text-white/60">
            Aucune carte bancaire · Annulation à tout moment
          </p>
        </div>
      </section>

    </div>
  )
}
