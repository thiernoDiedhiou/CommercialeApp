import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type KpiColor = 'blue' | 'green' | 'purple' | 'amber' | 'primary' | 'secondary'

interface KpiCardProps {
  title: string
  value: ReactNode
  subtitle?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  color?: KpiColor
  /** @deprecated use color instead */
  accent?: 'primary' | 'secondary'
  children?: ReactNode
  className?: string
}

const COLOR_MAP: Record<KpiColor, { icon: string; value: string; border: string }> = {
  blue:      { icon: 'bg-ds-blue-light text-ds-blue',      value: 'text-slate-900', border: 'border-ds-blue/10' },
  green:     { icon: 'bg-ds-green-light text-ds-green',    value: 'text-slate-900', border: 'border-ds-green/10' },
  purple:    { icon: 'bg-ds-purple-light text-ds-purple',  value: 'text-slate-900', border: 'border-ds-purple/10' },
  amber:     { icon: 'bg-amber-50 text-amber-600',         value: 'text-slate-900', border: 'border-amber-100' },
  primary:   { icon: 'bg-brand-primary/10 text-brand-primary', value: 'text-slate-900', border: 'border-transparent' },
  secondary: { icon: 'bg-brand-secondary/10 text-brand-secondary', value: 'text-slate-900', border: 'border-transparent' },
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
  accent = 'primary',
  children,
  className,
}: KpiCardProps) {
  const resolvedColor: KpiColor = color ?? (accent === 'secondary' ? 'secondary' : 'primary')
  const cls = COLOR_MAP[resolvedColor]

  return (
    <div className={cn('rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9', cls.icon)}>
            {icon}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className={cn('font-display text-xl font-bold tabular-nums sm:text-2xl', cls.value)}>{value}</span>
        {subtitle && (
          <span
            className={cn(
              'text-xs font-medium sm:text-sm',
              trend === 'up' && 'text-emerald-600',
              trend === 'down' && 'text-red-500',
              (!trend || trend === 'neutral') && 'text-slate-500',
            )}
          >
            {subtitle}
          </span>
        )}
      </div>

      {children && <div className="mt-3 border-t border-slate-50 pt-3">{children}</div>}
    </div>
  )
}
