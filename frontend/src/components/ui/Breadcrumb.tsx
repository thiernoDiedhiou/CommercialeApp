import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="mb-4 flex items-center gap-1 text-sm text-slate-500" aria-label="Fil d'Ariane">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />}
          {item.to && i < items.length - 1 ? (
            <Link to={item.to} className="hover:text-slate-800 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? 'font-medium text-slate-700' : ''}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
