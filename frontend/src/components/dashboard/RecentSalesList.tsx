import { Link } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Sale } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'

const STATUS_VARIANT: Record<Sale['status'], 'success' | 'warning' | 'danger'> = {
  confirmed: 'success',
  draft: 'warning',
  cancelled: 'danger',
}

const STATUS_LABEL: Record<Sale['status'], string> = {
  confirmed: 'Confirmée',
  draft: 'Brouillon',
  cancelled: 'Annulée',
}

interface RecentSalesListProps {
  sales: Sale[]
  loading?: boolean
}

export default function RecentSalesList({ sales, loading }: RecentSalesListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (sales.length === 0) {
    return <p className="text-sm text-gray-400">Aucune vente récente</p>
  }

  return (
    <ul className="divide-y divide-gray-50">
      {sales.map((sale) => (
        <li key={sale.id}>
          <Link
            to={`/sales/${sale.id}`}
            className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{sale.reference}</p>
              <p className="text-xs text-gray-400">{formatDateTime(sale.created_at)}</p>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-3">
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(sale.total)}
              </span>
              <Badge variant={STATUS_VARIANT[sale.status]}>{STATUS_LABEL[sale.status]}</Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
