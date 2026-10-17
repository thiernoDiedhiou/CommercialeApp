import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPublicPlans } from '@/services/api/public'
import { Check, ArrowRight } from 'lucide-react'
import DashboardMockup from '@/landing/components/DashboardMockup'
import FaqSection from '@/landing/components/FaqSection'
import FeatureShowcase from '@/landing/components/FeatureShowcase'
import SeoHead from '@/landing/components/SeoHead'

// ── Données ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    num: '01',
    accent: 'border-ds-blue',
    numColor: 'text-ds-blue',
    title: 'Caisse POS',
    desc: 'Encaissez rapidement en boutique ou sur mobile. Espèces, Orange Money, Wave. Reçu imprimable en un clic.',
  },
  {
    num: '02',
    accent: 'border-ds-green',
    numColor: 'text-ds-green',
    title: 'Gestion des stocks',
    desc: 'Suivez chaque produit en temps réel. Alertes automatiques avant rupture, mouvements traçables.',
  },
  {
    num: '03',
    accent: 'border-ds-purple',
    numColor: 'text-ds-purple',
    title: 'Clients & créances',
    desc: 'Fidelisez vos clients, suivez les paiements différés et relancez les dettes en un clic.',
  },
  {
    num: '04',
    accent: 'border-ds-blue',
    numColor: 'text-ds-blue',
    title: 'Facturation PDF',
    desc: 'Factures et devis professionnels aux couleurs de votre boutique. Envoi par email automatique.',
  },
  {
    num: '05',
    accent: 'border-ds-green',
    numColor: 'text-ds-green',
    title: 'Rapports & analyses',
    desc: 'Ventes, marges et produits stars en un coup d\'œil. Export CSV pour vos comptables.',
  },
  {
    num: '06',
    accent: 'border-ds-purple',
    numColor: 'text-ds-purple',
    title: 'Boutique en ligne',
    desc: 'Un lien à partager, vos clients commandent directement sans commission, sans installation.',
  },
]

const SECTORS = [
  { label: 'Commerce général',         desc: 'Épiceries, supérettes, multiservices',      dot: 'bg-ds-blue'   },
  { label: 'Alimentation & traiteur',  desc: 'Restaurants, fast-food, boulangeries',       dot: 'bg-ds-green'  },
  { label: 'Mode & prêt-à-porter',     desc: 'Boutiques, friperies, accessoires',          dot: 'bg-ds-purple' },
  { label: 'Cosmétique & beauté',      desc: 'Salons, instituts, distribution',            dot: 'bg-pink-500'  },
  { label: 'Commerce électronique',    desc: 'Boutiques en ligne, marketplaces',           dot: 'bg-cyan-500'  },
  { label: 'Pharmacie & para.',        desc: 'Officines, parapharmacies, dépôts',         dot: 'bg-emerald-500'},
  { label: 'Électronique & high-tech', desc: 'Téléphonie, informatique, accessoires',     dot: 'bg-orange-500' },
  { label: 'Prestations de services',  desc: 'Artisans, prestataires, ateliers',          dot: 'bg-yellow-500' },
]

const STATS = [
  { value: '8',  suffix: '+', label: 'Secteurs supportés'     },
  { value: '21', suffix: 'j', label: "Jours d'essai gratuit"  },
  { value: '5',  suffix: '+', label: 'Pays ciblés'            },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPrice(price: string): string {
  return Math.round(parseFloat(price)).toLocaleString('fr-FR')
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-ds-blue-light dark:bg-ds-blue/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ds-blue">
      {children}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate()

  const { data: plans = [] } = useQuery({
    queryKey: ['public-plans'],
    queryFn:  getPublicPlans,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="overflow-hidden">
      <SeoHead
        title="DiDi Sphere — Logiciel de gestion commerciale"
        description="Gérez vos ventes, stocks, clients et factures. Caisse POS, boutique en ligne, rapports en temps réel. Essai gratuit 21 jours."
        canonical="/"
        jsonLd={[
          {
            '@context'            : 'https://schema.org',
            '@type'               : 'SoftwareApplication',
            '@id'                 : 'https://didisphere.shop/#app',
            'name'                : 'DiDi Sphere',
            'applicationCategory' : 'BusinessApplication',
            'operatingSystem'     : 'Web',
            'url'                 : 'https://didisphere.shop',
            'description'         : "Logiciel de gestion commerciale SaaS pour PME d'Afrique de l'Ouest. Caisse POS, stocks, clients, factures, boutique en ligne.",
            'screenshot'          : 'https://didisphere.shop/og-image.png',
            'featureList'         : [
              'Caisse POS hors-ligne',
              'Gestion des stocks en temps réel',
              'Facturation PDF',
              'Boutique en ligne publique',
              'Rapports et analyses',
              'Multi-devises XOF EUR USD',
              'Multi-utilisateurs avec permissions',
              'Import CSV produits',
            ],
            'offers': { '@type': 'Offer', 'price': '5000', 'priceCurrency': 'XOF' },
            'publisher': { '@id': 'https://didisphere.shop/#organization' },
          },
          {
            '@context'   : 'https://schema.org',
            '@type'      : 'FAQPage',
            'mainEntity' : [
              { '@type': 'Question', 'name': "L'essai gratuit nécessite-t-il une carte bancaire ?",  'acceptedAnswer': { '@type': 'Answer', 'text': "Non. Aucune information de paiement n'est requise pour démarrer votre essai de 21 jours." } },
              { '@type': 'Question', 'name': 'Puis-je changer de plan à tout moment ?',               'acceptedAnswer': { '@type': 'Answer', 'text': 'Oui, sans frais de résiliation, depuis votre espace client.' } },
              { '@type': 'Question', 'name': 'Mes données sont-elles sécurisées ?',                   'acceptedAnswer': { '@type': 'Answer', 'text': "Vos données sont isolées dans un espace dédié (architecture multi-tenant), hébergées sur des serveurs sécurisés." } },
              { '@type': 'Question', 'name': 'Comment fonctionne le paiement ?',                      'acceptedAnswer': { '@type': 'Answer', 'text': 'Nous acceptons Orange Money, Wave et les virements bancaires. Facturation mensuelle ou annuelle.' } },
              { '@type': 'Question', 'name': 'Puis-je utiliser DiDi Sphere sur mobile ?',             'acceptedAnswer': { '@type': 'Answer', 'text': "Oui. L'interface est entièrement responsive et la caisse POS est optimisée pour tablette et smartphone." } },
              { '@type': 'Question', 'name': "Que se passe-t-il à la fin de l'essai gratuit ?",      'acceptedAnswer': { '@type': 'Answer', 'text': "Vous choisissez un plan payant pour continuer. Sinon votre compte est suspendu mais vos données conservées 30 jours." } },
            ],
          },
        ]}
      />

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* HERO                                                                    */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white dark:bg-gray-950 pt-24 pb-20">

        {/* Orbes mesh gradient */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-[500px] w-[500px] rounded-full bg-ds-blue/20 blur-[100px]" />
          <div className="absolute top-1/3 -left-40 h-[400px] w-[400px] rounded-full bg-ds-green/15 blur-[90px]" />
          <div className="absolute bottom-10 right-1/4 h-[320px] w-[320px] rounded-full bg-ds-purple/15 blur-[80px]" />
        </div>

        {/* Grille subtile */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 text-center">

          <h1 className="text-[2.75rem] sm:text-5xl lg:text-[4rem] font-extrabold leading-[1.08] tracking-tight text-gray-900 dark:text-white mb-6">
            Gérez moins.{' '}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-ds-blue to-ds-purple bg-clip-text text-transparent">
              Vendez plus.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-2xl mx-auto">
            Ventes, stocks, clients et factures. Tout en un seul endroit,
            pour les commerçants qui veulent aller plus loin.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => navigate('/inscription')}
              className="group flex items-center gap-2 rounded-xl bg-ds-blue px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-ds-blue/30 hover:bg-ds-blue-dark transition-all hover:scale-[1.03] active:scale-100"
            >
              Essai gratuit
            </button>
            <button
              type="button"
              onClick={() => navigate('/tarifs')}
              className="flex items-center gap-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-7 py-3.5 text-base font-bold text-gray-700 dark:text-gray-200 hover:border-ds-blue/50 hover:text-ds-blue dark:hover:text-ds-blue transition-all"
            >
              Voir les tarifs
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-14">
            Aucune carte bancaire requise · 21 jours d'essai gratuit · Annulation à tout moment
          </p>

          {/* Mockup dans chrome-style */}
          <div className="mx-auto max-w-4xl">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* STATS                                                                   */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="grid grid-cols-3 gap-6 text-center divide-x divide-gray-100 dark:divide-gray-800">
            {STATS.map(({ value, suffix, label }) => (
              <div key={label} className="px-4">
                <p className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tabular-nums">
                  {value}
                  <span className="text-ds-blue">{suffix}</span>
                </p>
                <p className="mt-2 text-sm font-medium text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* FEATURES                                                                */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section id="fonctionnalites" className="py-24 bg-gray-50 dark:bg-gray-900/40">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <SectionLabel>Fonctionnalités</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Tout ce qu'il faut pour gérer votre boutique
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Des outils pensés pour les réalités du commerce en Afrique de l'Ouest.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ num, accent, numColor, title, desc }) => (
              <div
                key={num}
                className={`group relative rounded-2xl bg-white dark:bg-gray-800 p-6 border border-gray-100 dark:border-gray-700 border-l-4 ${accent} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
              >
                <p className={`text-4xl font-black tabular-nums mb-3 ${numColor} opacity-80`}>{num}</p>
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
              Voir toutes les fonctionnalités <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* FEATURE SHOWCASE                                                        */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-6xl px-4 text-center mb-12">
          <SectionLabel>En action</SectionLabel>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
            Voyez le produit par vous-même
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Ce sont de vraies interfaces, interactives. Pas des captures d'écran.
          </p>
        </div>
        <FeatureShowcase />
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* SECTEURS                                                                */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900/40">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <SectionLabel>Secteurs</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Adapté à votre type de commerce
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              DiDi Sphere s'adapte à votre secteur d'activité avec les outils spécifiques à votre métier.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SECTORS.map(({ label, desc, dot }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate('/inscription')}
                className="group text-left rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:border-ds-blue/40 dark:hover:border-ds-blue/40 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{label}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                <p className="mt-3 text-xs font-semibold text-ds-blue opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Commencer <ArrowRight className="h-3 w-3" />
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* COMMENT ÇA MARCHE                                                       */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-16">
            <SectionLabel>Simple & rapide</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Opérationnel en 3 minutes
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            {/* Ligne connectrice desktop */}
            <div className="hidden md:block absolute top-6 left-[calc(16.5%+1.5rem)] right-[calc(16.5%+1.5rem)] h-px bg-gradient-to-r from-ds-blue via-ds-green to-ds-purple opacity-30" />

            {[
              { num: '01', color: 'bg-ds-blue',   title: 'Créez votre compte',        desc: 'Renseignez votre boutique, votre secteur et vos identifiants. Aucune carte requise.' },
              { num: '02', color: 'bg-ds-green',  title: 'Configurez votre boutique', desc: 'Ajoutez vos produits et catégories. Personnalisez vos couleurs de marque.' },
              { num: '03', color: 'bg-ds-purple', title: 'Commencez à vendre',        desc: 'Encaissez en POS, éditez vos factures et suivez vos stocks en temps réel.' },
            ].map(({ num, color, title, desc }) => (
              <div key={num} className="relative flex flex-col items-center text-center">
                <div className={`z-10 flex h-12 w-12 items-center justify-center rounded-full ${color} text-white font-black text-sm mb-5 ring-4 ring-white dark:ring-gray-950`}>
                  {num}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={() => navigate('/inscription')}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 dark:bg-white px-7 py-3.5 text-sm font-bold text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
            >
              Créer mon compte gratuitement <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* TARIFS APERÇU                                                           */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <section className="py-24 bg-gray-50 dark:bg-gray-900/40">
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
                    key={plan.uid}
                    className={`relative rounded-2xl p-6 flex flex-col transition-all ${
                      isHighlighted
                        ? 'bg-ds-blue text-white shadow-2xl shadow-ds-blue/30 scale-[1.03]'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-ds-blue/30 hover:shadow-md'
                    }`}
                  >
                    {plan.badge && (
                      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold ${
                        isHighlighted ? 'bg-ds-green text-white' : 'bg-ds-purple text-white'
                      }`}>
                        {plan.badge}
                      </span>
                    )}
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isHighlighted ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
                      {plan.name}
                    </p>
                    <div className="flex items-baseline gap-1 mb-3">
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
                            <Check className="h-4 w-4 shrink-0 mt-0.5 text-ds-green" />
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
                Comparer tous les plans <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* FAQ                                                                     */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <FaqSection />
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* CTA FINAL                                                               */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 bg-gray-950">
        {/* Glow radial profond */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-ds-blue/20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-ds-purple/15 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 text-center text-white">
          <p className="text-ds-blue font-semibold text-sm mb-3">Prêt à vous lancer ?</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
            Modernisez votre gestion<br className="hidden sm:block" /> dès aujourd'hui
          </h2>
          <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
            Rejoignez les boutiques qui font confiance à DiDi Sphere pour gérer leur commerce au quotidien.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/inscription')}
              className="group flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-gray-900 shadow-lg hover:bg-gray-50 transition-all hover:scale-105 active:scale-100"
            >
              Créer mon compte gratuit
            </button>
            <button
              type="button"
              onClick={() => navigate('/tarifs')}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-all"
            >
              Voir les tarifs
            </button>
          </div>
          <p className="mt-6 text-sm text-white/30">
            21 jours gratuits · Aucune carte · Annulation à tout moment
          </p>
        </div>
      </section>
    </div>
  )
}
