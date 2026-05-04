import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { WeekChartPoint } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface WeekChartProps {
  data: WeekChartPoint[]
}

function useBrandColor(): string {
  const [color, setColor] = useState('rgb(99,102,241)')

  useEffect(() => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-primary')
      .trim()
    if (raw) setColor(`rgb(${raw})`)
  }, [])

  return color
}

export default function WeekChart({ data }: WeekChartProps) {
  const brandColor = useBrandColor()

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
        <Bar dataKey="revenue" fill={brandColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
