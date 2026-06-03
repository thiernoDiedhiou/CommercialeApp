import { Link } from 'react-router-dom'

const LAST_UPDATED = '1er juin 2026'
const COMPANY      = 'DiDi Sphere'
const EMAIL        = 'contact@didisphere.sn'
const ADDRESS      = 'Dakar, République du Sénégal'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{children}</div>
    </section>
  )
}

export default function CGUPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4">

        {/* En-tête */}
        <div className="mb-12">
          <span className="inline-block rounded-full bg-ds-blue-light dark:bg-ds-blue/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ds-blue mb-4">
            Légal
          </span>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
            Conditions Générales d'Utilisation
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">Dernière mise à jour : {LAST_UPDATED}</p>
        </div>

        <div className="prose-custom">

          <Section title="1. Présentation du service">
            <p>
              {COMPANY} est un logiciel de gestion commerciale en mode SaaS (Software as a Service)
              édité et exploité par l'équipe {COMPANY}, domiciliée à {ADDRESS}.
            </p>
            <p>
              Le service permet aux entreprises (ci-après « Tenants ») de gérer leurs ventes, stocks,
              clients, fournisseurs et factures via une interface web accessible depuis tout navigateur
              moderne.
            </p>
          </Section>

          <Section title="2. Acceptation des conditions">
            <p>
              L'accès et l'utilisation du service impliquent l'acceptation pleine et entière des présentes
              Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, vous ne
              devez pas utiliser le service.
            </p>
            <p>
              {COMPANY} se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
              seront informés de toute modification importante par email ou via l'interface du service.
              La poursuite de l'utilisation du service après notification vaut acceptation des nouvelles
              conditions.
            </p>
          </Section>

          <Section title="3. Inscription et compte utilisateur">
            <p>
              Pour accéder au service, l'utilisateur doit créer un compte en fournissant des informations
              exactes et complètes. Chaque compte est strictement personnel et ne peut être partagé.
            </p>
            <p>
              L'utilisateur est seul responsable de la confidentialité de ses identifiants de connexion.
              Toute utilisation frauduleuse ou non autorisée du compte doit être signalée immédiatement
              à {COMPANY} via {EMAIL}.
            </p>
            <p>
              {COMPANY} se réserve le droit de suspendre ou de supprimer tout compte en cas de violation
              des présentes CGU ou de comportement préjudiciable à la plateforme ou à d'autres utilisateurs.
            </p>
          </Section>

          <Section title="4. Accès au service et disponibilité">
            <p>
              {COMPANY} s'efforce de maintenir le service accessible 24h/24 et 7j/7, sous réserve des
              opérations de maintenance, des pannes techniques et des événements de force majeure.
            </p>
            <p>
              Des interruptions programmées peuvent survenir et seront, dans la mesure du possible,
              annoncées à l'avance. {COMPANY} ne saurait être tenu responsable des conséquences d'une
              indisponibilité du service.
            </p>
          </Section>

          <Section title="5. Offres, abonnements et tarification">
            <p>
              {COMPANY} propose plusieurs plans d'abonnement décrits sur la page{' '}
              <Link to="/tarifs" className="text-ds-blue hover:underline">Tarifs</Link>.
              Les prix sont exprimés dans la devise de votre plan (FCFA, EUR, USD…) et sont susceptibles d'évoluer.
            </p>
            <p>
              Tout abonnement commence par une période d'essai gratuite dont la durée est précisée sur
              la page Tarifs. À l'issue de l'essai, l'accès au service est conditionné au règlement de
              l'abonnement choisi.
            </p>
            <p>
              Les paiements sont non remboursables sauf disposition légale contraire ou accord exprès
              de {COMPANY}. En cas de résiliation, l'accès est maintenu jusqu'à la fin de la période
              payée.
            </p>
          </Section>

          <Section title="6. Propriété des données">
            <p>
              Les données saisies par l'utilisateur dans la plateforme (produits, clients, ventes, etc.)
              lui appartiennent intégralement. {COMPANY} n'exploite pas ces données à des fins commerciales
              et ne les cède pas à des tiers.
            </p>
            <p>
              En cas de résiliation, l'utilisateur peut demander l'export de ses données dans un délai
              de 30 jours suivant la résiliation. Passé ce délai, les données peuvent être supprimées
              définitivement.
            </p>
          </Section>

          <Section title="7. Propriété intellectuelle">
            <p>
              L'ensemble des éléments constituant la plateforme {COMPANY} (interface, logo, code source,
              bases de données, textes, graphiques) est protégé par les lois sur la propriété
              intellectuelle et reste la propriété exclusive de {COMPANY}.
            </p>
            <p>
              Toute reproduction, représentation, modification ou exploitation non autorisée est
              strictement interdite.
            </p>
          </Section>

          <Section title="8. Responsabilités et limitations">
            <p>
              {COMPANY} ne saurait être tenu responsable des dommages directs ou indirects résultant
              de l'utilisation ou de l'impossibilité d'utiliser le service, de la perte de données ou
              de tout préjudice commercial.
            </p>
            <p>
              L'utilisateur est seul responsable de l'utilisation qu'il fait du service et des données
              qu'il y introduit. Il s'engage à respecter la législation applicable dans son pays d'exercice.
            </p>
          </Section>

          <Section title="9. Résiliation">
            <p>
              L'utilisateur peut résilier son compte à tout moment depuis les paramètres de son espace
              ou en contactant {EMAIL}. La résiliation prend effet à la fin de la période d'abonnement
              en cours.
            </p>
            <p>
              {COMPANY} peut résilier un compte sans préavis en cas de violation grave des présentes CGU,
              d'activité illicite ou de non-paiement persistant.
            </p>
          </Section>

          <Section title="10. Droit applicable et litiges">
            <p>
              Les présentes CGU sont régies par le droit sénégalais. En cas de litige, les parties
              s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut,
              les tribunaux compétents de Dakar seront seuls compétents.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l'adresse
              suivante : <a href={`mailto:${EMAIL}`} className="text-ds-blue hover:underline">{EMAIL}</a>
            </p>
          </Section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-sm">
          <Link to="/confidentialite" className="text-ds-blue hover:underline">
            → Politique de confidentialité
          </Link>
          <Link to="/contact" className="text-gray-500 hover:text-gray-700 hover:underline">
            Nous contacter
          </Link>
        </div>

      </div>
    </div>
  )
}
