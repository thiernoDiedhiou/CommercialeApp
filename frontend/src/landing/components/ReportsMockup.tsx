import { useState, useEffect, useRef } from 'react'
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline'

const REPORT_BARS = [52, 78, 61, 85, 70, 95, 88]
const REPORT_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const TOP_PRODUCTS = [
  { rank: 1, name: 'Coca-Cola 33cl',   sold: 156, revenue: 93600  },
  { rank: 2, name: 'Eau Kirène 1.5L',  sold: 98,  revenue: 49000  },
  { rank: 3, name: 'Riz Parfumé 5kg',  sold: 67,  revenue: 167500 },
]

const TABS_REPORT = ['Ventes', 'Produits', 'Stock'] as const
type ReportTab = typeof TABS_REPORT[number]

const TAB_KPIS: Record<ReportTab, { label: string; value: string; color: string; bar: string; unit?: string }[]> = {
  Ventes: [
    { label: 'Ventes du mois', value: '284 500', color: 'text-ds-blue',    bar: 'bg-ds-blue',    unit: 'F CFA' },
    { label: 'Commandes',      value: '47',       color: 'text-ds-green',   bar: 'bg-ds-green'                  },
    { label: 'Marge brute',    value: '82 300',   color: 'text-ds-purple',  bar: 'bg-ds-purple',  unit: 'F CFA' },
  ],
  Produits: [
    { label: 'Produits actifs',   value: '124',     color: 'text-ds-blue',    bar: 'bg-ds-blue'    },
    { label: 'Ruptures de stock', value: '3',       color: 'text-red-500',    bar: 'bg-red-400'    },
    { label: 'Rotation moy.',     value: '8 jours', color: 'text-ds-green',   bar: 'bg-ds-green'   },
  ],
  Stock: [
    { label: 'Valeur du stock', value: '1 840 000', color: 'text-ds-blue',    bar: 'bg-ds-blue',    unit: 'F CFA' },
    { label: 'Réf. en stock',   value: '1 247',     color: 'text-ds-green',   bar: 'bg-ds-green'                  },
    { label: 'Alertes actives', value: '5',          color: 'text-orange-500', bar: 'bg-orange-400'                },
  ],
}

export default function ReportsMockup() {
  const [animated, setAnimated]   = useState(false)
  const [activeTab, setActiveTab] = useState<ReportTab>('Ventes')
  const ref                       = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setAnimated(true); observer.disconnect() } },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="flex h-[280px] sm:h-[360px] bg-gray-50 overflow-hidden text-left flex-col p-3 sm:p-4 gap-2">

      {/* Onglets rapport */}
      <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-lg p-1 w-fit shrink-0">
        {TABS_REPORT.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`rounded-md px-2.5 py-1 text-[7px] font-semibold transition-all ${
              activeTab === t
                ? 'bg-ds-blue text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* KPI cards — dynamiques selon l'onglet actif */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {TAB_KPIS[activeTab].map(({ label, value, color, bar, unit }) => (
          <div key={label} className="rounded-xl bg-white border border-gray-100 shadow-sm p-2">
            <p className="text-[7px] text-gray-400 mb-0.5">{label}</p>
            <p className={`text-[10px] font-extrabold ${color} transition-all duration-300`}>{value}</p>
            {unit && <p className="text-[5px] text-gray-300 mb-1">{unit}</p>}
            <div className="h-0.5 rounded-full bg-gray-100 mt-1">
              <div
                className={`h-full rounded-full ${bar} transition-all duration-700 ease-out`}
                style={{ width: animated ? '65%' : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Graphe + top produits */}
      <div className="grid grid-cols-5 gap-2 flex-1 min-h-0">

        {/* Graphe */}
        <div className="col-span-3 rounded-xl bg-white border border-gray-100 shadow-sm p-2.5 flex flex-col">
          <p className="text-[7px] font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <ArrowTrendingUpIcon className="h-2.5 w-2.5 text-ds-green" />
            Évolution des ventes
            <span className="ml-auto text-[5px] text-ds-green font-bold">▲ +18%</span>
          </p>
          <div className="flex items-end gap-1 h-[40px] sm:h-[64px]">
            {REPORT_BARS.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end h-full">
                <div
                  className={`rounded-sm w-full ${i === 5 ? 'bg-ds-green' : 'bg-ds-green-light'}`}
                  style={{
                    height: `${h}%`,
                    transform: animated ? 'scaleY(1)' : 'scaleY(0)',
                    transformOrigin: 'bottom',
                    transition: `transform 700ms ease-out ${i * 80}ms`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {REPORT_DAYS.map((d) => (
              <span key={d} className="flex-1 text-center text-[6px] text-gray-300">{d}</span>
            ))}
          </div>
        </div>

        {/* Top produits */}
        <div className="col-span-2 rounded-xl bg-white border border-gray-100 shadow-sm p-2.5 flex flex-col">
          <p className="text-[7px] font-semibold text-gray-500 mb-2">Top produits</p>
          <div className="flex flex-col gap-2.5 flex-1">
            {TOP_PRODUCTS.map(({ rank, name, sold, revenue }) => (
              <div key={rank} className="flex items-start gap-1.5">
                <span className={`text-[7px] font-extrabold shrink-0 ${rank === 1 ? 'text-ds-blue' : 'text-gray-300'}`}>
                  #{rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[7px] font-medium text-gray-700 truncate">{name}</p>
                  <p className="text-[5px] text-gray-400">{sold} vendus</p>
                  <p className="text-[5px] font-semibold text-ds-green">{revenue.toLocaleString('fr-FR')} F</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
