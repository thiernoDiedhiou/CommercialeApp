import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: ReactNode
  subtitle?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  accent?: 'primary' | 'secondary'
  children?: ReactNode
  className?: string
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = 'primary',
  children,
  className,
}: KpiCardProps) {
  const iconCls = accent === 'secondary'
    ? 'bg-brand-secondary/10 text-brand-secondary'
    : 'bg-brand-primary/10 text-brand-primary'

  return (
    <div className={cn('rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconCls)}>
            {icon}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {subtitle && (
          <span
            className={cn(
              'text-sm font-medium',
              trend === 'up' && 'text-emerald-600',
              trend === 'down' && 'text-red-500',
              (!trend || trend === 'neutral') && 'text-gray-500',
            )}
          >
            {subtitle}
          </span>
        )}
      </div>

      {children && <div className="mt-3 border-t border-gray-50 pt-3">{children}</div>}
    </div>
  )
}
