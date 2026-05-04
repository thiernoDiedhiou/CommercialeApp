import Badge from '@/components/ui/Badge'
import { SkeletonRow } from '@/components/ui/Skeleton'
import type { StockAlert, ExpiringSoon } from '@/types'
import { formatDate } from '@/lib/utils'

interface StockAlertListProps {
  alerts: StockAlert[]
  expiring: ExpiringSoon[]
  loading?: boolean
}

export default function StockAlertList({ alerts, expiring, loading }: StockAlertListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Alertes stock</h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune alerte</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {alerts.map((item) => (
              <li
                key={item.variant_id ?? item.product_id}
                className="flex items-center justify-between py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{item.product_name}</p>
                  {item.variant_summary && (
                    <p className="truncate text-xs text-gray-400">{item.variant_summary}</p>
                  )}
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span className="text-sm text-gray-600">{item.current_stock}</span>
                  <Badge variant={item.current_stock === 0 ? 'danger' : 'warning'}>
                    {item.current_stock === 0 ? 'Rupture' : 'Bas'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {expiring.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Lots expirant bientôt</h3>
          <ul className="divide-y divide-gray-50">
            {expiring.map((lot) => (
              <li
                key={`${lot.product_id}-${lot.lot_number}`}
                className="flex items-center justify-between py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{lot.product_name}</p>
                  <p className="text-xs text-gray-400">Lot {lot.lot_number}</p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span className="text-xs text-gray-500">{lot.quantity_remaining} u.</span>
                  <Badge variant="warning">{formatDate(lot.expiry_date)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
