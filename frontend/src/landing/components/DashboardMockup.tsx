import { useState, useEffect, useRef } from 'react'
import {
  HomeIcon, ShoppingCartIcon, CurrencyDollarIcon, ArchiveBoxIcon,
  ClipboardDocumentListIcon, UsersIcon, ChartBarIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline'

const MOCK_BARS = [38, 62, 48, 75, 52, 88, 68]

const MOCK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const MOCK_BASE_KPI = { ventes: 47500, ca: 1240000, benefice: 380000 }

const MOCK_ALL_SALES = [
  { name: 'Fatou Diallo',  amount: '12 500', initial: 'F' },
  { name: 'Moussa Koné',   amount: '8 200',  initial: 'M' },
  { name: 'Awa Traoré',    amount: '21 000', initial: 'A' },
  { name: 'Ibrahim Sy',    amount: '15 300', initial: 'I' },
  { name: 'Mariam Diop',   amount: '9 800',  initial: 'M' },
]

const MOCK_NAV = [
  { label: 'Tableau de bord', Icon: HomeIcon },
  { label: 'Caisse POS',      Icon: ShoppingCartIcon },
  { label: 'Ventes',          Icon: CurrencyDollarIcon },
  { label: 'Produits',        Icon: ArchiveBoxIcon },
  { label: 'Stock',           Icon: ClipboardDocumentListIcon },
  { label: 'Clients',         Icon: UsersIcon },
  { label: 'Rapports',        Icon: ChartBarIcon },
  { label: 'Paramètres',      Icon: Cog6ToothIcon },
]

export default function DashboardMockup() {
  const [animatedBars, setAnimatedBars] = useState(false)
  const [kpi, setKpi]                   = useState(MOCK_BASE_KPI)
  const [activeTab, setActiveTab]       = useState('Tableau de bord')
  const [fading, setFading]             = useState(false)
  const [salesPage, setSalesPage]       = useState(0)
  const [lastUpdate, setLastUpdate]     = useState(0)
  const wrapperRef                      = useRef<HTMLDivElement>(null)

  const dotCount     = MOCK_ALL_SALES.length - 2
  const visibleSales = MOCK_ALL_SALES.slice(salesPage, salesPage + 3)

  // Déclenche l'animation des barres quand le composant entre dans le viewport
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setAnimatedBars(true); observer.disconnect() } },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // KPI oscillent autour des valeurs de base (jamais infini)
  useEffect(() => {
    const id = setInterval(() => {
      setKpi({
        ventes:   MOCK_BASE_KPI.ventes   + Math.round((Math.random() * 2 - 1) * 2000),
        ca:       MOCK_BASE_KPI.ca       + Math.round((Math.random() * 2 - 1) * 20000),
        benefice: MOCK_BASE_KPI.benefice + Math.round((Math.random() * 2 - 1) * 8000),
      })
      setLastUpdate(0)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  // Compteur "il y a Xs"
  useEffect(() => {
    const id = setInterval(() => setLastUpdate((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Carrousel ventes récentes
  useEffect(() => {
    const id = setInterval(() => setSalesPage((p) => (p + 1) % dotCount), 3500)
    return () => clearInterval(id)
  }, [dotCount])

  const handleTabClick = (label: string) => {
    if (label === activeTab) return
    setFading(true)
    setTimeout(() => { setActiveTab(label); setFading(false) }, 150)
  }

  return (
    <div
      ref={wrapperRef}
      className="w-full rounded-2xl overflow-hidden shadow-[0_24px_64px_-8px_rgba(36,101,237,0.18),0_8px_32px_-4px_rgba(0,0,0,0.08)] border border-gray-200/80 ring-1 ring-gray-900/5 hover:shadow-[0_32px_80px_-12px_rgba(36,101,237,0.25)] transition-shadow duration-500"
    >
      {/* Chrome navigateur */}
      <div className="flex items-center gap-3 bg-gray-900 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 rounded-md bg-gray-800 px-3 py-1 text-[10px] text-gray-400 font-mono text-center">
          app.didisphere.sn/dashboard
        </div>
        <span className="flex items-center gap-1 text-[8px] text-green-400 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* App — sidebar masquée sur mobile, visible à partir de sm */}
      <div className="flex h-[280px] sm:h-[360px] bg-gray-50 overflow-hidden text-left">

        {/* Sidebar desktop uniquement */}
        <div className="hidden sm:flex w-40 shrink-0 bg-white border-r border-gray-200 flex-col py-3 px-2 gap-0.5">
          <div className="flex items-center gap-1.5 px-2 mb-4">
            <div className="h-5 w-5 rounded-md bg-ds-blue" />
            <span className="text-[9px] font-extrabold text-gray-800 truncate">DiDi Sphere</span>
          </div>

          {MOCK_NAV.map(({ label, Icon }) => {
            const isActive = activeTab === label
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleTabClick(label)}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[9px] font-medium w-full text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-ds-blue text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <Icon className={`h-3 w-3 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Contenu principal */}
        <div
          className={`flex-1 overflow-hidden p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 transition-opacity duration-150 ${fading ? 'opacity-40' : 'opacity-100'}`}
        >
          {/* En-tête */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-gray-800 flex items-center gap-2">
              {activeTab}
              <span className="text-[6px] font-normal bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                ● temps réel
              </span>
            </p>
            <p className="text-[6px] text-gray-300">il y a {lastUpdate}s</p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Ventes du jour', value: kpi.ventes,   cls: 'text-ds-blue',   barBg: 'bg-ds-blue-light',   bar: 'bg-ds-blue',   trend: '+12%' },
              { label: "Chiffre d'aff.", value: kpi.ca,       cls: 'text-ds-green',  barBg: 'bg-ds-green-light',  bar: 'bg-ds-green',  trend: '+8%'  },
              { label: 'Bénéfice',       value: kpi.benefice, cls: 'text-ds-purple', barBg: 'bg-ds-purple-light', bar: 'bg-ds-purple', trend: '+15%' },
            ].map(({ label, value, cls, barBg, bar, trend }) => (
              <div key={label} className="rounded-xl bg-white border border-gray-100 shadow-sm p-2 hover:shadow-md transition-shadow">
                <p className="text-[7px] text-gray-400 mb-0.5">{label}</p>
                <p className={`text-[10px] font-extrabold tabular-nums ${cls} transition-all duration-700`}>
                  {value.toLocaleString('fr-FR')}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[5px] text-gray-300 mt-0.5">F CFA</p>
                  <p className="text-[5px] text-green-500 font-bold">{trend}</p>
                </div>
                <div className={`mt-1.5 h-0.5 rounded-full w-3/4 ${barBg}`}>
                  <div
                    className={`h-full rounded-full ${bar} transition-all duration-700 ease-out`}
                    style={{ width: animatedBars ? '60%' : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Graphe + ventes récentes */}
          <div className="grid grid-cols-5 gap-2 flex-1 min-h-0">

            {/* Graphe barres */}
            <div className="col-span-3 rounded-xl bg-white border border-gray-100 shadow-sm p-2.5 flex flex-col">
              <p className="text-[7px] font-semibold text-gray-500 mb-2 flex items-center justify-between">
                CA des 7 derniers jours
                <span className="text-[5px] text-green-500">▲ +23% vs semaine dernière</span>
              </p>
              <div className="flex items-end gap-1 h-[56px] sm:h-[80px]">
                {MOCK_BARS.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end h-full">
                    <div
                      className={`rounded-sm w-full ${i === 5 ? 'bg-ds-blue' : 'bg-ds-blue-light'}`}
                      style={{
                        height: `${h}%`,
                        transform: animatedBars ? 'scaleY(1)' : 'scaleY(0)',
                        transformOrigin: 'bottom',
                        transition: `transform 700ms ease-out ${i * 80}ms`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                {MOCK_DAYS.map((d, i) => (
                  <span key={i} className="flex-1 text-center text-[6px] text-gray-300">{d}</span>
                ))}
              </div>
            </div>

            {/* Ventes récentes avec carrousel */}
            <div className="col-span-2 rounded-xl bg-white border border-gray-100 shadow-sm p-2.5 flex flex-col">
              <p className="text-[7px] font-semibold text-gray-500 mb-2">Ventes récentes</p>
              <div className="flex flex-col gap-2 flex-1">
                {visibleSales.map(({ name, amount, initial }) => (
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
              {/* Dots pagination */}
              <div className="flex justify-center gap-1 mt-2">
                {Array.from({ length: dotCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSalesPage(i)}
                    className={`h-0.5 rounded-full transition-all duration-300 ${
                      i === salesPage ? 'w-3 bg-ds-blue' : 'w-1.5 bg-gray-200'
                    }`}
                    aria-label={`Page ${i + 1}`}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
