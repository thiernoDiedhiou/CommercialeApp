/**
 * SSG prerender — injecte les meta tags SEO dans dist/index.html
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

// ── Données SEO par route ─────────────────────────────────────────────────────

const ROUTES = [
  {
    path        : '/',
    title       : `${SITE_NAME} — Logiciel de gestion commerciale pour PME d'Afrique de l'Ouest`,
    description : 'Gérez vos ventes, stocks, clients et factures en un seul endroit. Caisse POS, boutique en ligne, rapports en temps réel. Essai gratuit 21 jours.',
  },
  {
    path        : '/fonctionnalites',
    title       : `Fonctionnalités — ${SITE_NAME}`,
    description : 'Caisse POS, gestion des stocks, facturation PDF, boutique en ligne, rapports en temps réel… Découvrez tous les outils DiDi Sphere pour piloter votre commerce.',
  },
  {
    path        : '/tarifs',
    title       : `Tarifs — ${SITE_NAME}`,
    description : 'Des plans pour chaque étape de votre croissance. Commencez gratuitement pendant 21 jours. Orange Money, Wave et virement bancaire acceptés. Sans engagement.',
  },
  {
    path        : '/contact',
    title       : `Contact — ${SITE_NAME}`,
    description : "Contactez l'équipe DiDi Sphere pour toute question sur notre logiciel de gestion commerciale SaaS pour PME d'Afrique de l'Ouest.",
  },
  {
    path        : '/inscription',
    title       : `Créer mon compte — ${SITE_NAME}`,
    description : 'Démarrez votre essai gratuit de 21 jours. Aucune carte bancaire requise. Configurez votre boutique en 3 minutes.',
  },
  {
    path        : '/cgu',
    title       : `Conditions générales d'utilisation — ${SITE_NAME}`,
    description : `Conditions générales d'utilisation du logiciel ${SITE_NAME} — logiciel de gestion commerciale SaaS pour PME.`,
  },
  {
    path        : '/confidentialite',
    title       : `Politique de confidentialité — ${SITE_NAME}`,
    description : `Politique de confidentialité et traitement des données personnelles de ${SITE_NAME} — logiciel de gestion commerciale SaaS pour PME.`,
  },
]

// ── Générateur de balises <head> ──────────────────────────────────────────────

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildHeadTags({ path: routePath, title, description }) {
  const canonical = `${BASE_URL}${routePath}`
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:locale" content="fr_SN" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(title)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<meta name="twitter:image:alt" content="${esc(title)}" />`,
  ].join('\n    ')
}

// ── Prerender ─────────────────────────────────────────────────────────────────

async function prerender() {
  if (!fs.existsSync(DIST)) {
    console.error('❌ dist/ not found — run "vite build" first')
    process.exit(1)
  }

  const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8')

  // Supprime les balises injectées par Vite dans index.html
  // (title et description par défaut de index.html public)
  const stripped = template
    .replace(/<title>[^<]*<\/title>/g, '')
    .replace(/<meta name="description"[^>]*>/g, '')

  for (const route of ROUTES) {
    const tags    = buildHeadTags(route)
    const html    = stripped.replace('</head>', `    ${tags}\n  </head>`)

    const outDir  = route.path === '/'
      ? DIST
      : path.join(DIST, route.path)

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8')
    console.log(`✓  ${route.path}`)
  }

  console.log('\n✅ Prerender terminé — ' + ROUTES.length + ' routes générées')
}

prerender().catch((err) => { console.error(err); process.exit(1) })
