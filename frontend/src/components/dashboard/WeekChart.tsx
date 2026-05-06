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

export default function WeekChart({ data }: WeekChartProps) {
  const { primary, secondary } = useBrandColors()
  const lastIndex = data.length - 1

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
                ? `${(v / 1_000).toFixed(0)}k`
                : String(v)
          }
          width={48}
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
