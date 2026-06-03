import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { getPublicSiteSettings } from '@/services/api/public'

const NAV_LINKS = [
  { label: 'Fonctionnalités', path: '/fonctionnalites' },
  { label: 'Tarifs',          path: '/tarifs' },
  { label: 'Contact',         path: '/contact' },
]

const SECTORS = ['Commerce général', 'Alimentation', 'Mode', 'Cosmétique']

// ── Détection préférence initiale ─────────────────────────────────────────────

function getInitialTheme(): boolean {
  const stored = localStorage.getItem('landing-theme')
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  const navigate  = useNavigate()
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const headerBase = scrolled
    ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur shadow-sm dark:shadow-gray-900/50'
    : 'bg-white dark:bg-gray-950'

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 border-b border-transparent dark:border-gray-800 ${headerBase}`}>
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="shrink-0">
          <img
            src={isDark ? '/logo_blanc.svg' : '/logo_mode_claire.svg'}
            alt="DiDi Sphere"
            className="h-8 w-auto"
          />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.path}
              to={l.path}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-ds-blue'
                    : 'text-gray-600 dark:text-gray-300 hover:text-ds-blue dark:hover:text-ds-blue'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Actions desktop */}
        <div className="hidden md:flex items-center gap-2">
          {/* Toggle dark mode */}
          <button
            type="button"
            aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            onClick={onToggle}
            className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-ds-blue dark:hover:text-ds-blue transition-colors px-3 py-1.5"
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => navigate('/inscription')}
            className="flex items-center gap-1.5 rounded-lg bg-ds-blue px-4 py-2 text-sm font-semibold text-white hover:bg-ds-blue-dark transition-colors"
          >
            Essai gratuit
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {/* Mobile : toggle + hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            aria-label={isDark ? 'Mode clair' : 'Mode sombre'}
            onClick={onToggle}
            className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Drawer mobile */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 z-50 w-72 bg-white dark:bg-gray-900 shadow-xl flex flex-col md:hidden border-l border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 dark:border-gray-800">
              <img
                src={isDark ? '/logo_blanc.svg' : '/logo_mode_claire.svg'}
                alt="DiDi Sphere"
                className="h-7 w-auto"
              />
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-5 py-6 space-y-1">
              {NAV_LINKS.map((l) => (
                <NavLink
                  key={l.path}
                  to={l.path}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-ds-blue-light dark:bg-ds-blue/20 text-ds-blue'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <div className="px-5 pb-8 space-y-3">
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/login') }}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/inscription') }}
                className="w-full rounded-lg bg-ds-blue py-2.5 text-sm font-semibold text-white hover:bg-ds-blue-dark transition"
              >
                Essai gratuit →
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  const { data: settings } = useQuery({
    queryKey:  ['public-site-settings'],
    queryFn:   getPublicSiteSettings,
    staleTime: 10 * 60 * 1000,
  })

  const email   = settings?.contact_email
  const address = settings?.contact_address

  const socials = [
    { label: 'Facebook',  url: settings?.facebook_url },
    { label: 'X',         url: settings?.twitter_url },
    { label: 'LinkedIn',  url: settings?.linkedin_url },
    { label: 'Instagram', url: settings?.instagram_url },
  ].filter((s) => s.url)

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <img src="/logo_mode_sombre_texte_claire.svg" alt="DiDi Sphere" className="h-8 w-auto" />
            <p className="text-sm leading-relaxed">
              Logiciel de gestion commerciale tout-en-un pour les PME d'Afrique de l'Ouest.
              Multi-devises, adapté à votre secteur.
            </p>
            <p className="text-xs text-gray-600">
              Sénégal · Côte d'Ivoire · Mali · Guinée · Burkina Faso
            </p>
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-1">
                {socials.map(({ label, url }) => (
                  <a
                    key={label}
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Produit */}
          <div>
            <p className="mb-4 text-sm font-semibold text-white">Produit</p>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Fonctionnalités', to: '/fonctionnalites' },
                { label: 'Tarifs',          to: '/tarifs' },
                { label: 'Essai gratuit',   to: '/inscription' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Secteurs */}
          <div>
            <p className="mb-4 text-sm font-semibold text-white">Secteurs</p>
            <ul className="space-y-2.5 text-sm">
              {SECTORS.map((s) => (
                <li key={s} className="text-gray-500">{s}</li>
              ))}
            </ul>
          </div>

          {/* Contact — dynamique */}
          <div>
            <p className="mb-4 text-sm font-semibold text-white">Contact</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">Nous écrire</Link>
              </li>
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="hover:text-white transition-colors break-all">
                    {email}
                  </a>
                </li>
              )}
              {address && (
                <li className="text-gray-500">{address}</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} DiDi Sphere — Diedhiou & Dieng. Tous droits réservés.</p>
          <div className="flex gap-4">
            <Link to="/cgu" className="hover:text-gray-400 transition-colors">CGU</Link>
            <Link to="/confidentialite" className="hover:text-gray-400 transition-colors">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Layout principal ──────────────────────────────────────────────────────────

export default function LandingLayout() {
  const [isDark, setIsDark] = useState(getInitialTheme)

  const toggle = () => {
    setIsDark((d) => {
      const next = !d
      localStorage.setItem('landing-theme', next ? 'dark' : 'light')
      return next
    })
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 transition-colors duration-200">
        <Navbar isDark={isDark} onToggle={toggle} />
        <main className="flex-1 pt-16">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
