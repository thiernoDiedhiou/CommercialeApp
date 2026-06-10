import { Link } from 'react-router-dom'

const LAST_UPDATED = '1er juin 2026'
const COMPANY      = 'DiDi Sphere'
const EMAIL        = 'contact@didisphere.sn'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{children}</div>
    </section>
  )
}

function DataTable({ rows }: { rows: { data: string; purpose: string; retention: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700 mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 text-left">
            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Donnée</th>
            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Finalité</th>
            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Durée de conservation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{r.data}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.purpose}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-500">{r.retention}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4">

        {/* En-tête */}
        <div className="mb-12">
          <span className="inline-block rounded-full bg-ds-purple-light px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ds-purple mb-4">
            Légal
          </span>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            Politique de Confidentialité
          </h1>
          <p className="text-sm text-gray-400">Dernière mise à jour : {LAST_UPDATED}</p>
        </div>

        <Section title="1. Responsable du traitement">
          <p>
            Le responsable du traitement des données personnelles collectées via la plateforme {COMPANY}
            est l'équipe {COMPANY}, domiciliée à Dakar, République du Sénégal.
          </p>
          <p>
            Pour toute question relative à vos données personnelles, vous pouvez nous contacter à{' '}
            <a href={`mailto:${EMAIL}`} className="text-ds-blue hover:underline">{EMAIL}</a>.
          </p>
        </Section>

        <Section title="2. Données collectées">
          <p>Nous collectons les données suivantes :</p>

          <DataTable rows={[
            {
              data:      'Nom, prénom, email',
              purpose:   'Création et gestion du compte utilisateur',
              retention: 'Durée du compte + 30 jours',
            },
            {
              data:      'Nom de l\'entreprise, secteur d\'activité',
              purpose:   'Configuration de l\'espace de travail',
              retention: 'Durée du compte + 30 jours',
            },
            {
              data:      'Données métier (produits, clients, ventes…)',
              purpose:   'Fonctionnement du service',
              retention: 'Durée du compte + 30 jours après résiliation',
            },
            {
              data:      'Adresse IP, données de navigation',
              purpose:   'Sécurité, prévention de la fraude',
              retention: '90 jours',
            },
            {
              data:      'Emails de contact',
              purpose:   'Réponse aux demandes d\'assistance',
              retention: '2 ans',
            },
          ]} />
        </Section>

        <Section title="3. Finalités du traitement">
          <p>Vos données sont utilisées pour :</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Fournir et améliorer le service {COMPANY}</li>
            <li>Gérer votre compte et votre abonnement</li>
            <li>Vous envoyer les notifications techniques liées au service (alertes de stock, factures, etc.)</li>
            <li>Assurer la sécurité de la plateforme et détecter les fraudes</li>
            <li>Respecter nos obligations légales et comptables</li>
          </ul>
          <p className="mt-3">
            Nous n'utilisons pas vos données à des fins publicitaires et ne les cédons pas à des tiers
            à des fins commerciales.
          </p>
        </Section>

        <Section title="4. Base légale du traitement">
          <p>Le traitement de vos données est fondé sur :</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>L'exécution du contrat</strong> — pour les données nécessaires au fonctionnement du service</li>
            <li><strong>L'intérêt légitime</strong> — pour la sécurité et la prévention de la fraude</li>
            <li><strong>Le consentement</strong> — pour les communications marketing éventuelles (avec opt-out possible)</li>
            <li><strong>L'obligation légale</strong> — pour la conservation des données comptables</li>
          </ul>
        </Section>

        <Section title="5. Partage des données">
          <p>
            Vos données peuvent être partagées avec des sous-traitants techniques intervenant dans le
            cadre du service (hébergement, envoi d'emails transactionnels). Ces sous-traitants sont
            liés par des obligations de confidentialité et ne peuvent utiliser vos données que pour les
            prestations qui leur sont confiées.
          </p>
          <p>
            Nous pouvons être tenus de divulguer certaines données sur réquisition des autorités
            judiciaires ou administratives compétentes.
          </p>
        </Section>

        <Section title="6. Hébergement et transferts">
          <p>
            Les données sont hébergées sur des serveurs situés en Europe ou en Afrique de l'Ouest.
            En cas de transfert hors de ces zones, {COMPANY} s'assure que des garanties appropriées
            sont mises en place (clauses contractuelles types, etc.).
          </p>
        </Section>

        <Section title="7. Sécurité">
          <p>
            {COMPANY} met en œuvre des mesures techniques et organisationnelles adaptées pour protéger
            vos données contre tout accès non autorisé, perte, altération ou divulgation :
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Chiffrement des mots de passe (bcrypt)</li>
            <li>Connexions HTTPS obligatoires</li>
            <li>Isolation stricte des données entre tenants (architecture multi-tenant)</li>
            <li>Tokens d'accès à durée de vie limitée</li>
            <li>Sauvegardes régulières</li>
          </ul>
        </Section>

        <Section title="8. Vos droits">
          <p>Conformément à la législation applicable, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Accès</strong> — obtenir une copie de vos données personnelles</li>
            <li><strong>Rectification</strong> — corriger des données inexactes ou incomplètes</li>
            <li><strong>Effacement</strong> — demander la suppression de vos données (« droit à l'oubli »)</li>
            <li><strong>Portabilité</strong> — recevoir vos données dans un format structuré et lisible</li>
            <li><strong>Opposition</strong> — vous opposer à certains traitements</li>
            <li><strong>Limitation</strong> — demander la limitation du traitement dans certains cas</li>
          </ul>
          <p className="mt-3">
            Pour exercer ces droits, contactez-nous à{' '}
            <a href={`mailto:${EMAIL}`} className="text-ds-blue hover:underline">{EMAIL}</a>.
            Nous répondrons dans un délai de 30 jours.
          </p>
        </Section>

        <Section title="9. Cookies">
          <p>
            {COMPANY} utilise uniquement des cookies strictement nécessaires au fonctionnement du service
            (session d'authentification, préférences d'interface). Aucun cookie publicitaire ou de
            tracking tiers n'est utilisé.
          </p>
        </Section>

        <Section title="10. Modifications de cette politique">
          <p>
            Nous pouvons mettre à jour cette politique de confidentialité. Toute modification importante
            sera notifiée par email ou via un bandeau dans l'application. La date de dernière mise à
            jour est indiquée en haut de cette page.
          </p>
        </Section>

        <Section title="11. Contact et réclamations">
          <p>
            Pour toute question ou réclamation relative à la protection de vos données personnelles,
            contactez-nous à{' '}
            <a href={`mailto:${EMAIL}`} className="text-ds-blue hover:underline">{EMAIL}</a>.
          </p>
          <p>
            Si vous estimez que vos droits ne sont pas respectés après nous avoir contactés, vous avez
            la possibilité de saisir l'autorité de protection des données compétente dans votre pays.
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-sm">
          <Link to="/cgu" className="text-ds-blue hover:underline">
            → Conditions Générales d'Utilisation
          </Link>
          <Link to="/contact" className="text-gray-500 hover:text-gray-700 hover:underline">
            Nous contacter
          </Link>
        </div>

      </div>
    </div>
  )
}
