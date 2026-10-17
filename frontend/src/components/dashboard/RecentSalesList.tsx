import { Link } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
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
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <ClipboardDocumentListIcon className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Aucune vente récente</p>
        <p className="mt-1 text-xs text-slate-400">Les dernières transactions apparaîtront ici.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-50">
      {sales.map((sale) => {
        const href    = sale.channel === 'shop' ? '/shop-orders' : `/sales/${sale.uid}`
        const variant = STATUS_VARIANT[sale.status] ?? 'info'
        const label   = STATUS_LABEL[sale.status]  ?? sale.status

        return (
          <li key={`${sale.channel}-${sale.uid}`}>
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
