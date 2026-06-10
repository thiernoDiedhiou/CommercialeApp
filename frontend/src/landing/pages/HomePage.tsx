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
  { value: '4',  label: 'Secteurs supportés',     suffix: '' },
  { value: '21', label: "Jours d'essai gratuit",  suffix: 'j' },
  { value: '5',  label: 'Pays ciblés',            suffix: '+' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: string): string {
  const n = Math.round(parseFloat(price))
  return n.toLocaleString('fr-FR')
}

// ── Mockup dashboard ──────────────────────────────────────────────────────────

function DashboardMockup() {
  const bars = [38, 62, 48, 75, 52, 88, 68]
  const sales = [
    { name: 'Fatou Diallo',  amount: '12 500', initial: 'F' },
    { name: 'Moussa Koné',   amount: '8 200',  initial: 'M' },
    { name: 'Awa Traoré',    amount: '21 000', initial: 'A' },
  ]

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-[0_24px_64px_-8px_rgba(36,101,237,0.18),0_8px_32px_-4px_rgba(0,0,0,0.08)] border border-gray-200/80 ring-1 ring-gray-900/5">
      {/* Chrome navigateur */}
      <div className="flex items-center gap-3 bg-gray-900 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 rounded-md bg-gray-800 px-3 py-1 text-[10px] text-gray-400 font-mono">
          didisphere.sn/dashboard
        </div>
      </div>

      {/* App */}
      <div className="flex h-[360px] bg-gray-50 overflow-hidden text-left">

        {/* Sidebar */}
        <div className="w-40 shrink-0 bg-white border-r border-gray-200 flex flex-col py-3 px-2 gap-0.5">
          <div className="flex items-center gap-1.5 px-2 mb-4">
            <div className="h-5 w-5 rounded-md bg-ds-blue" />
            <span className="text-[9px] font-extrabold text-gray-800 truncate">Commerce Démo</span>
          </div>
          {[
            { label: 'Tableau de bord', active: true  },
            { label: 'Caisse POS',      active: false },
            { label: 'Ventes',          active: false },
            { label: 'Produits',        active: false },
            { label: 'Stock',           active: false },
            { label: 'Clients',         active: false },
            { label: 'Rapports',        active: false },
          ].map(({ label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[9px] font-medium ${
                active ? 'bg-ds-blue text-white' : 'text-gray-500'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${active ? 'bg-white' : 'bg-gray-300'}`} />
              {label}
            </div>
          ))}
        </div>

        {/* Contenu principal */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col gap-3">

          <p className="text-[11px] font-extrabold text-gray-800">Tableau de bord</p>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Ventes du jour', value: '47 500',    valueClass: 'text-ds-blue',   barBg: 'bg-ds-blue-light',   bar: 'bg-ds-blue'   },
              { label: "Chiffre d'aff.", value: '1 240 000', valueClass: 'text-ds-green',  barBg: 'bg-ds-green-light',  bar: 'bg-ds-green'  },
              { label: 'Bénéfice',       value: '380 000',   valueClass: 'text-ds-purple', barBg: 'bg-ds-purple-light', bar: 'bg-ds-purple' },
            ].map(({ label, value, valueClass, barBg, bar }) => (
              <div key={label} className="rounded-xl bg-white border border-gray-100 shadow-sm p-2">
                <p className="text-[7px] text-gray-400 mb-0.5">{label}</p>
                <p className={`text-[10px] font-extrabold ${valueClass}`}>{value}</p>
                <p className="text-[6px] text-gray-300 mt-0.5">F CFA</p>
                <div className={`mt-1.5 h-0.5 rounded-full w-3/4 ${barBg}`}>
                  <div className={`h-full rounded-full w-1/2 ${bar}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Graphe + ventes récentes */}
          <div className="grid grid-cols-5 gap-2 flex-1 min-h-0">

            <div className="col-span-3 rounded-xl bg-white border border-gray-100 shadow-sm p-2.5 flex flex-col">
              <p className="text-[7px] font-semibold text-gray-500 mb-2">CA des 7 derniers jours</p>
              <div className="flex items-end gap-1 flex-1">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end">
                    <div
                      className={`rounded-sm transition-all ${i === 5 ? 'bg-ds-blue' : 'bg-ds-blue-light'}`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                  <span key={i} className="flex-1 text-center text-[6px] text-gray-300">{d}</span>
                ))}
              </div>
            </div>

            <div className="col-span-2 rounded-xl bg-white border border-gray-100 shadow-sm p-2.5 flex flex-col">
              <p className="text-[7px] font-semibold text-gray-500 mb-2">Ventes récentes</p>
              <div className="flex flex-col gap-2">
                {sales.map(({ name, amount, initial }) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 rounded-full bg-ds-blue-light flex items-center justify-center shrink-0">
                        <span className="text-[7px] font-bold text-ds-blue">{initial}</span>
                      </div>
                      <span className="text-[7px] text-gray-600 truncate max-w-[48px]">{name.split(' ')[0]}</span>
                    </div>
                    <span className="text-[7px] font-bold text-ds-green">{amount}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Composants ────────────────────────────────────────────────────────────────

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
      <section className="relative overflow-hidden bg-white dark:bg-gray-950 pt-20 pb-16">

        {/* Décoration arrière-plan — orbes très subtils */}
        <div className="hero-bg-glow absolute inset-0 pointer-events-none" />
        <div className="absolute top-32 -left-24 h-64 w-64 rounded-full bg-ds-purple/5 blur-3xl pointer-events-none" />
        <div className="absolute top-16 -right-16 h-72 w-72 rounded-full bg-ds-green/5 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 text-center">

          <h1 className="text-[2.6rem] sm:text-5xl lg:text-[3.75rem] font-extrabold leading-[1.1] text-gray-900 dark:text-white mb-6">
            Gérez moins.{' '}
            <span className="text-ds-blue">Vendez plus.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 leading-relaxed mb-10 max-w-2xl mx-auto">
            Ventes, stocks, clients et factures — tout en un seul endroit,
            pour les commerçants qui veulent aller plus loin.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => navigate('/inscription')}
              className="flex items-center gap-2 rounded-xl bg-ds-blue px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-ds-blue/25 hover:bg-ds-blue-dark transition-all hover:scale-105 active:scale-100"
            >
              Essai gratuit <ArrowRightIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/tarifs')}
              className="flex items-center gap-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-7 py-3.5 text-base font-bold text-gray-700 dark:text-gray-200 hover:border-ds-blue/50 hover:text-ds-blue transition-all"
            >
              Voir les tarifs
            </button>
          </div>

          <p className="text-sm text-gray-400">
            Aucune carte bancaire requise · 21 jours d'essai gratuit
          </p>
        </div>
      </section>

      {/* ── Mockup section ──────────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <DashboardMockup />
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
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
            <Link to="/fonctionnalites" className="inline-flex items-center gap-2 text-ds-blue font-semibold hover:underline">
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
              <div
                key={label}
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
              { step: '01', color: 'text-ds-blue',   bg: 'bg-ds-blue',   title: 'Créez votre compte',       desc: 'Renseignez le nom de votre boutique, votre secteur et vos identifiants. Aucune carte requise.' },
              { step: '02', color: 'text-ds-green',  bg: 'bg-ds-green',  title: 'Configurez votre boutique', desc: 'Ajoutez vos produits, vos catégories et personnalisez vos couleurs de marque.' },
              { step: '03', color: 'text-ds-purple', bg: 'bg-ds-purple', title: 'Commencez à vendre',        desc: 'Encaissez depuis la caisse POS, générez vos factures et suivez vos stocks en temps réel.' },
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
              <Link to="/tarifs" className="inline-flex items-center gap-2 text-ds-blue font-semibold hover:underline">
                Comparer tous les plans <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA final ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 bg-gray-950">
        <div className="cta-bg-glow absolute inset-0 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-4 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Prêt à moderniser votre gestion ?
          </h2>
          <p className="text-lg text-white/70 mb-10">
            Rejoignez les PME d'Afrique de l'Ouest qui font confiance à DiDi Sphere
            pour gérer leur commerce au quotidien.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/inscription')}
              className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-ds-blue shadow-lg hover:bg-gray-50 transition-all hover:scale-105 active:scale-100"
            >
              Créer mon compte gratuit <ArrowRightIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/tarifs')}
              className="flex items-center gap-2 rounded-xl border-2 border-white/20 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-all"
            >
              Voir les tarifs
            </button>
          </div>
          <p className="mt-6 text-sm text-white/40">
            Aucune carte bancaire · Annulation à tout moment
          </p>
        </div>
      </section>

    </div>
  )
}
