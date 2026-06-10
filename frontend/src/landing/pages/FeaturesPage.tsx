import { useNavigate } from 'react-router-dom'
import {
  ShoppingCartIcon, CubeIcon, UsersIcon, DocumentTextIcon,
  ChartBarIcon, GlobeAltIcon, TruckIcon, ArrowPathIcon,
  BellAlertIcon, UserGroupIcon, TagIcon, ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'

const FEATURE_GROUPS = [
  {
    label:    'Ventes & Caisse',
    color:    'ds-blue',
    bgLight:  'bg-ds-blue-light',
    textColor: 'text-ds-blue',
    features: [
      { icon: ShoppingCartIcon, title: 'Caisse POS', desc: 'Encaissez en boutique ou sur mobile. Mode hors-ligne avec synchronisation automatique. Reçu imprimable.' },
      { icon: ArrowPathIcon,    title: 'Retours & Avoirs', desc: 'Gérez les retours clients, générez des avoirs et réajustez le stock automatiquement.' },
      { icon: TagIcon,          title: 'Variantes produit', desc: 'Taille, couleur, pointure — créez des combinaisons sans limite pour chaque produit.' },
    ],
  },
  {
    label:    'Stock & Produits',
    color:    'ds-green',
    bgLight:  'bg-ds-green-light',
    textColor: 'text-ds-green',
    features: [
      { icon: CubeIcon,       title: 'Gestion des stocks',  desc: 'Suivez vos niveaux de stock en temps réel. Mouvements tracés, journal immuable.' },
      { icon: BellAlertIcon,  title: 'Alertes de rupture', desc: 'Notifications automatiques quand un produit passe sous son seuil critique.' },
      { icon: ArrowUpTrayIcon, title: 'Import CSV',         desc: 'Importez ou mettez à jour des centaines de produits en quelques secondes avec un fichier CSV.' },
    ],
  },
  {
    label:    'Clients & Finances',
    color:    'ds-purple',
    bgLight:  'bg-ds-purple-light',
    textColor: 'text-ds-purple',
    features: [
      { icon: UsersIcon,        title: 'Gestion clients',  desc: 'Carnet clients complet avec historique d\'achats, créances et coordonnées.' },
      { icon: DocumentTextIcon, title: 'Facturation PDF',  desc: 'Créez des factures et devis professionnels. Envoi par email automatique.' },
      { icon: TruckIcon,        title: 'Fournisseurs & Achats', desc: 'Gérez vos commandes fournisseurs, réceptions partielles et suivi des coûts.' },
    ],
  },
  {
    label:    'Pilotage & Croissance',
    color:    'ds-blue',
    bgLight:  'bg-ds-blue-light',
    textColor: 'text-ds-blue',
    features: [
      { icon: ChartBarIcon,   title: 'Rapports & Analyses', desc: 'Tableaux de bord en temps réel, ventes par période, produits les plus vendus, stocks à risque.' },
      { icon: GlobeAltIcon,   title: 'Boutique en ligne',   desc: 'Partagez votre catalogue avec un lien public. Commandes directes sans marketplace.' },
      { icon: UserGroupIcon,  title: 'Multi-utilisateurs', desc: 'Ajoutez votre équipe avec des rôles et permissions granulaires (vendeur, gestionnaire, admin).' },
    ],
  },
]

const SECTORS = [
  {
    emoji: '🛒',
    label: 'Commerce général',
    desc: 'Épiceries, supérettes, quincailleries, multiservices',
    details: ['Gestion des produits en vrac ou au détail', 'POS rapide pour les files d\'attente', 'Suivi des dettes clients'],
  },
  {
    emoji: '🍽️',
    label: 'Alimentation & traiteur',
    desc: 'Restaurants, fast-food, boulangeries, traiteurs',
    details: ['Variantes par taille ou formule', 'Gestion des ingrédients', 'Tickets de caisse thermique'],
  },
  {
    emoji: '👗',
    label: 'Mode & prêt-à-porter',
    desc: 'Boutiques, friperies, accessoires, chaussures',
    details: ['Variantes taille/couleur/pointure', 'Import catalogue CSV', 'Fiches produits avec photos'],
  },
  {
    emoji: '💄',
    label: 'Cosmétique & beauté',
    desc: 'Salons, instituts, distribution de produits cosmétiques',
    details: ['Gestion des lots et dates d\'expiration', 'Boutique en ligne catalogue', 'Marques et catégories'],
  },
]

export default function FeaturesPage() {
  const navigate = useNavigate()

  return (
    <div className="py-20">

      {/* Header */}
      <div className="mx-auto max-w-3xl px-4 text-center mb-20">
        <span className="inline-block rounded-full bg-ds-blue-light dark:bg-ds-blue/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ds-blue mb-4">
          Fonctionnalités
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
          Tout ce qu'il faut pour gérer votre commerce
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
          DiDi Sphere centralise toutes les opérations de votre boutique — des ventes à la comptabilité — dans un seul outil pensé pour l'Afrique de l'Ouest.
        </p>
      </div>

      {/* Groupes de fonctionnalités */}
      {FEATURE_GROUPS.map(({ label, bgLight, textColor, features }) => (
        <section key={label} className="mb-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center gap-3 mb-10">
              <span className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
              <span className={`rounded-full ${bgLight} dark:bg-opacity-20 ${textColor} px-4 py-1 text-sm font-bold`}>{label}</span>
              <span className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 hover:shadow-md transition-shadow">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${bgLight} ${textColor} mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Secteurs */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-ds-purple-light dark:bg-ds-purple/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ds-purple mb-4">
              Secteurs
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Adapté à votre type d'activité
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {SECTORS.map(({ emoji, label, desc, details }) => (
              <div key={label} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{emoji}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">{label}</h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{desc}</p>
                    <ul className="space-y-1.5">
                      {details.map((d) => (
                        <li key={d} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-ds-green shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">
            Prêt à tester toutes ces fonctionnalités ?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            21 jours d'essai gratuit. Aucune carte bancaire requise.
          </p>
          <button
            type="button"
            onClick={() => navigate('/inscription')}
            className="rounded-xl bg-ds-blue px-8 py-4 text-base font-bold text-white hover:bg-ds-blue-dark transition-all shadow-lg shadow-ds-blue/30"
          >
            Démarrer gratuitement →
          </button>
        </div>
      </section>

    </div>
  )
}
