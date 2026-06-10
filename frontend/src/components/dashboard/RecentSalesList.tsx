import { Link } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import type { RecentTransaction } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  confirmed : 'success',
  draft     : 'warning',
  cancelled : 'danger',
  preparing : 'info',
  shipped   : 'info',
  delivered : 'success',
}

const STATUS_LABEL: Record<string, string> = {
  confirmed : 'Confirmée',
  draft     : 'Brouillon',
  cancelled : 'Annulée',
  preparing : 'En prép.',
  shipped   : 'Expédiée',
  delivered : 'Livrée',
}

interface Props {
  sales   : RecentTransaction[]
  loading?: boolean
}


export default function RecentSalesList({ sales, loading }: Props) {
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
      {sales.map((sale) => {
        const href    = sale.channel === 'shop' ? '/shop-orders' : `/sales/${sale.id}`
        const variant = STATUS_VARIANT[sale.status] ?? 'info'
        const label   = STATUS_LABEL[sale.status]  ?? sale.status

        return (
          <li key={`${sale.channel}-${sale.id}`}>
            <Link
              to={href}
              className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{sale.reference}</p>
                  {sale.channel === 'shop' && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                      En ligne
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {sale.customer && <span className="mr-1">{sale.customer} ·</span>}
                  {formatDateTime(sale.created_at)}
                </p>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-3">
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(sale.total)}
                </span>
                <Badge variant={variant}>{label}</Badge>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
