import { useEffect, useState } from 'react'
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { WeekChartPoint } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface WeekChartProps {
  data: WeekChartPoint[]
}

function useBrandColors(): { primary: string; secondary: string } {
  const [colors, setColors] = useState({ primary: 'rgb(99,102,241)', secondary: 'rgb(109,40,217)' })

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement)
    const p = styles.getPropertyValue('--brand-primary').trim()
    const s = styles.getPropertyValue('--brand-secondary').trim()
    setColors({
      primary:   p ? `rgb(${p})` : 'rgb(99,102,241)',
      secondary: s ? `rgb(${s})` : 'rgb(109,40,217)',
    })
  }, [])

  return colors
}

function fmtXDate(dateStr: string, totalPoints: number): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  if (totalPoints <= 7) {
    // Affiche "12 Oct"
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      .replace('.', '')
  }
  if (totalPoints <= 31) {
    // Affiche "12/10"
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  // 90 jours → affiche "Oct '24"
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }).replace('.', '')
}

export default function WeekChart({ data }: WeekChartProps) {
  const { primary, secondary } = useBrandColors()
  const lastIndex   = data.length - 1
  const totalPoints = data.length

  // Pour 30/90 jours, n'afficher qu'un tick sur N pour éviter l'encombrement
  const tickInterval = totalPoints <= 7 ? 0 : totalPoints <= 31 ? 4 : 14

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          interval={tickInterval}
          tickFormatter={(v: string) => fmtXDate(v, totalPoints)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
                ? `${Math.round(v / 1_000)}k`
                : String(v)
          }
          width={52}
        />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'CA']}
          labelStyle={{ fontWeight: 600 }}
          contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.12)' }}
        />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={index === lastIndex ? secondary : primary}
              fillOpacity={index === lastIndex ? 1 : 0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
