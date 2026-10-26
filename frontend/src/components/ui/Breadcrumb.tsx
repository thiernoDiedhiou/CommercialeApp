import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      className={cn('mb-4 flex min-w-0 items-center gap-1 text-sm text-gray-500 dark:text-gray-400', className)}
      aria-label="Fil d'Ariane"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
            )}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="shrink-0 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast
                    ? 'truncate font-medium text-gray-700 dark:text-gray-200'
                    : 'shrink-0',
                )}
              >
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
