/**
 * SSG prerender — injecte les meta tags SEO + JSON-LD dans dist/index.html
 * pour chaque route landing, afin que les bots reçoivent le bon HTML
 * sans attendre l'hydratation JavaScript.
 *
 * Usage : node scripts/prerender.mjs  (appelé par npm run build:ssg)
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST      = path.resolve(__dirname, '../dist')
const BASE_URL  = 'https://didisphere.shop'
const OG_IMAGE  = `${BASE_URL}/og-image.png`
const SITE_NAME = 'DiDi Sphere'

// ── Schemas JSON-LD réutilisables ─────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    '@type': 'Question',
    'name': "L'essai gratuit nécessite-t-il une carte bancaire ?",
    'acceptedAnswer': { '@type': 'Answer', 'text': "Non. Aucune information de paiement n'est requise pour démarrer votre essai de 21 jours." },
  },
  {
    '@type': 'Question',
    'name': 'Puis-je changer de plan à tout moment ?',
    'acceptedAnswer': { '@type': 'Answer', 'text': 'Oui, sans frais de résiliation, depuis votre espace client.' },
  },
  {
    '@type': 'Question',
    'name': 'Mes données sont-elles sécurisées ?',
    'acceptedAnswer': { '@type': 'Answer', 'text': "Vos données sont isolées dans un espace dédié (architecture multi-tenant), hébergées sur des serveurs sécurisés." },
  },
  {
    '@type': 'Question',
    'name': 'Comment fonctionne le paiement ?',
    'acceptedAnswer': { '@type': 'Answer', 'text': 'Nous acceptons Orange Money, Wave et les virements bancaires. Facturation mensuelle ou annuelle.' },
  },
  {
    '@type': 'Question',
    'name': 'Puis-je utiliser DiDi Sphere sur mobile ?',
    'acceptedAnswer': { '@type': 'Answer', 'text': "Oui. L'interface est entièrement responsive et la caisse POS est optimisée pour tablette et smartphone." },
  },
  {
    '@type': 'Question',
    'name': "Que se passe-t-il à la fin de l'essai gratuit ?",
    'acceptedAnswer': { '@type': 'Answer', 'text': "Vous choisissez un plan payant pour continuer. Sinon votre compte est suspendu mais vos données conservées 30 jours." },
  },
]

const SOFTWARE_APP = {
  '@context'            : 'https://schema.org',
  '@type'               : 'SoftwareApplication',
  '@id'                 : `${BASE_URL}/#app`,
  'name'                : SITE_NAME,
  'applicationCategory' : 'BusinessApplication',
  'operatingSystem'     : 'Web',
  'url'                 : BASE_URL,
  'description'         : "Logiciel de gestion commerciale SaaS pour PME d'Afrique de l'Ouest. Caisse POS, stocks, clients, factures, boutique en ligne.",
  'screenshot'          : OG_IMAGE,
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
  'offers': {
    '@type'         : 'Offer',
    'price'         : '5000',
    'priceCurrency' : 'XOF',
  },
  'publisher': { '@id': `${BASE_URL}/#organization` },
}

const FAQ_PAGE = {
  '@context'   : 'https://schema.org',
  '@type'      : 'FAQPage',
  'mainEntity' : FAQ_ITEMS,
}

const LOCAL_BUSINESS = {
  '@context'     : 'https://schema.org',
  '@type'        : 'Organization',
  '@id'          : `${BASE_URL}/#organization`,
  'name'         : SITE_NAME,
  'url'          : BASE_URL,
  'email'        : 'contact@didisphere.shop',
  'description'  : "Logiciel de gestion commerciale SaaS pour PME d'Afrique de l'Ouest.",
  'contactPoint' : {
    '@type'             : 'ContactPoint',
    'contactType'       : 'customer support',
    'email'             : 'contact@didisphere.shop',
    'availableLanguage' : 'French',
  },
  'areaServed' : ['SN', 'CI', 'ML', 'BF', 'GN', 'CM', 'TG', 'BJ'],
  'address'    : {
    '@type'           : 'PostalAddress',
    'addressLocality' : 'Thiès',
    'addressCountry'  : 'SN',
  },
}

// ── Données SEO par route ─────────────────────────────────────────────────────

const ROUTES = [
  {
    path        : '/',
    title       : `${SITE_NAME} — Logiciel de gestion commerciale`,
    description : 'Gérez vos ventes, stocks, clients et factures. Caisse POS, boutique en ligne, rapports en temps réel. Essai gratuit 21 jours.',
    jsonLd      : [SOFTWARE_APP, FAQ_PAGE],
  },
  {
    path        : '/fonctionnalites',
    title       : `Fonctionnalités — ${SITE_NAME}`,
    description : 'Caisse POS, gestion des stocks, facturation PDF, boutique en ligne, rapports en temps réel… Découvrez tous les outils DiDi Sphere pour piloter votre commerce.',
    jsonLd      : [SOFTWARE_APP],
  },
  {
    path        : '/tarifs',
    title       : `Tarifs — ${SITE_NAME}`,
    description : 'Des plans pour chaque étape de votre croissance. Commencez gratuitement pendant 21 jours. Orange Money, Wave et virement bancaire acceptés. Sans engagement.',
    jsonLd      : [FAQ_PAGE],
  },
  {
    path        : '/contact',
    title       : `Contact — ${SITE_NAME}`,
    description : "Contactez l'équipe DiDi Sphere pour toute question sur notre logiciel de gestion commerciale SaaS pour PME d'Afrique de l'Ouest.",
    jsonLd      : [LOCAL_BUSINESS],
  },
  {
    path        : '/inscription',
    title       : `Créer mon compte — ${SITE_NAME}`,
    description : 'Démarrez votre essai gratuit de 21 jours. Aucune carte bancaire requise. Configurez votre boutique en 3 minutes.',
    jsonLd      : null,
  },
  {
    path        : '/cgu',
    title       : `Conditions générales d'utilisation — ${SITE_NAME}`,
    description : `Conditions générales d'utilisation du logiciel ${SITE_NAME} — logiciel de gestion commerciale SaaS pour PME.`,
    jsonLd      : null,
  },
  {
    path        : '/confidentialite',
    title       : `Politique de confidentialité — ${SITE_NAME}`,
    description : `Politique de confidentialité et traitement des données personnelles de ${SITE_NAME} — logiciel de gestion commerciale SaaS pour PME.`,
    jsonLd      : null,
  },
]

// ── Générateur de balises <head> ──────────────────────────────────────────────

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildHeadTags({ path: routePath, title, description, jsonLd }) {
  const canonical = `${BASE_URL}${routePath}`
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:locale" content="fr_SN" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:secure_url" content="${OG_IMAGE}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(title)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@didisphere" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<meta name="twitter:image:alt" content="${esc(title)}" />`,
  ]

  if (jsonLd) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
    )
  }

  return tags.join('\n    ')
}

// ── Prerender ─────────────────────────────────────────────────────────────────

async function prerender() {
  if (!fs.existsSync(DIST)) {
    console.error('❌ dist/ not found — run "vite build" first')
    process.exit(1)
  }

  const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8')

  // Supprime les balises injectées par Vite dans index.html
  const stripped = template
    .replace(/<title>[^<]*<\/title>/g, '')
    .replace(/<meta name="description"[^>]*>/g, '')
    .replace(/<meta name="robots"[^>]*>/g, '')

  for (const route of ROUTES) {
    const tags   = buildHeadTags(route)
    const html   = stripped.replace('</head>', `    ${tags}\n  </head>`)

    const outDir = route.path === '/'
      ? DIST
      : path.join(DIST, route.path)

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8')
    console.log(`✓  ${route.path}`)
  }

  console.log('\n✅ Prerender terminé — ' + ROUTES.length + ' routes générées')
}

prerender().catch((err) => { console.error(err); process.exit(1) })
