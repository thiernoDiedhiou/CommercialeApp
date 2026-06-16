import { useState } from 'react'
import { ShoppingCartIcon, ChartBarIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import PosMockup from './PosMockup'
import ReportsMockup from './ReportsMockup'
import ShopMockup from './ShopMockup'

const TABS = [
  {
    key:   'pos',
    label: 'Caisse POS',
    Icon:  ShoppingCartIcon,
    url:   'app.didisphere.sn/pos',
    desc:  'Encaissez en quelques secondes. Espèces, Orange Money ou Wave — tout en un clic. Cliquez sur les produits pour essayer.',
  },
  {
    key:   'reports',
    label: 'Rapports',
    Icon:  ChartBarIcon,
    url:   'app.didisphere.sn/rapports',
    desc:  'Visualisez vos ventes, votre marge et vos produits stars. Données en temps réel, exportables en CSV.',
  },
  {
    key:   'shop',
    label: 'Boutique en ligne',
    Icon:  GlobeAltIcon,
    url:   'boutique.didisphere.sn/demo',
    desc:  'Partagez votre catalogue avec un simple lien. Vos clients commandent directement — sans commission.',
  },
]

function BrowserChrome({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-[0_24px_64px_-8px_rgba(36,101,237,0.18),0_8px_32px_-4px_rgba(0,0,0,0.08)] border border-gray-200/80 ring-1 ring-gray-900/5">
      <div className="flex items-center gap-3 bg-gray-900 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 rounded-md bg-gray-800 px-3 py-1 text-[10px] text-gray-400 font-mono text-center">
          {url}
        </div>
        <span className="flex items-center gap-1 text-[8px] text-green-400 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          Live
        </span>
      </div>
      {children}
    </div>
  )
}

const TAB_KEYS = TABS.map((t) => t.key)

export default function FeatureShowcase() {
  const [active, setActive] = useState('pos')
  const [fading, setFading] = useState(false)

  const switchTab = (key: string) => {
    if (key === active) return
    setFading(true)
    setTimeout(() => { setActive(key); setFading(false) }, 150)
  }

  const handleKeyDown = (e: React.KeyboardEvent, currentKey: string) => {
    const idx = TAB_KEYS.indexOf(currentKey)
    if (e.key === 'ArrowRight') switchTab(TAB_KEYS[(idx + 1) % TAB_KEYS.length])
    if (e.key === 'ArrowLeft')  switchTab(TAB_KEYS[(idx - 1 + TAB_KEYS.length) % TAB_KEYS.length])
  }

  const activeTab = TABS.find((t) => t.key === active)!

  return (
    <div className="mx-auto max-w-4xl px-4">

      {/* Tabs — navigation clavier ← → */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            tabIndex={active === key ? 0 : -1}
            onClick={() => switchTab(key)}
            onKeyDown={(e) => handleKeyDown(e, key)}
            aria-label={label}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              active === key
                ? 'bg-ds-blue text-white shadow-lg shadow-ds-blue/25'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
        {activeTab.desc}
      </p>

      {/* Mockup avec transition */}
      <div className={`transition-opacity duration-150 ${fading ? 'opacity-0' : 'opacity-100'}`}>
        <BrowserChrome url={activeTab.url}>
          {active === 'pos'     && <PosMockup />}
          {active === 'reports' && <ReportsMockup />}
          {active === 'shop'    && <ShopMockup />}
        </BrowserChrome>
      </div>

    </div>
  )
}
