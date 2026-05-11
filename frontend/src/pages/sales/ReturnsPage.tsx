import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUturnLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { getReturns } from '@/services/api/sales'
import Badge from '@/components/ui/Badge'
import { SkeletonRow } from '@/components/ui/Skeleton'
import Pagination from '@/components/ui/Pagination'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { RefundMethod } from '@/types'

const REFUND_LABELS: Record<RefundMethod, string> = {
  cash:   'Espèces',
  credit: 'Avoir client',
  none:   'Sans remboursement',
}

const REFUND_BADGE: Record<RefundMethod, 'success' | 'info' | 'default'> = {
  cash:   'success',
  credit: 'info',
  none:   'default',
}

export default function ReturnsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refundFilter, setRefundFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['returns', { search, page, refundFilter }],
    queryFn: () => getReturns({ search: search || undefined, page, refund_method: refundFilter || undefined }),
  })

  const returns = data?.data ?? []

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ArrowUturnLeftIcon className="h-6 w-6 text-gray-400" />
          <h1 className="text-xl font-bold text-gray-900">Retours</h1>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher une référence…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <select
          value={refundFilter}
          onChange={(e) => { setRefundFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <option value="">Tous les types</option>
          <option value="cash">Remboursement espèces</option>
          <option value="credit">Avoir client</option>
          <option value="none">Sans remboursement</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Référence</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Vente d'origine</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Articles</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Remboursement</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-3"><SkeletonRow /></td>
                    </tr>
                  ))
                : returns.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                      Aucun retour enregistré.
                    </td>
                  </tr>
                )
                : returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                      {ret.reference}
                    </td>
                    <td className="px-4 py-3">
                      {ret.sale ? (
                        <Link
                          to={`/sales/${ret.sale_id}`}
                          className="font-mono text-brand-primary hover:underline"
                        >
                          {ret.sale.reference}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(ret.created_at)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {ret.items_count ?? '—'} article(s)
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={REFUND_BADGE[ret.refund_method]}>
                        {REFUND_LABELS[ret.refund_method]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(ret.total)}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {data && data.last_page > 1 && (
          <div className="border-t border-gray-100 px-4 py-3">
            <Pagination
              currentPage={data.current_page}
              lastPage={data.last_page}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
