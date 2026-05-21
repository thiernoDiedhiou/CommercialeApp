import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ExclamationCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { getDebts } from '@/services/api/customers'
import { SkeletonRow } from '@/components/ui/Skeleton'
import Pagination from '@/components/ui/Pagination'
import { formatCurrency } from '@/lib/utils'

export default function DebtsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['debts', { search, page }],
    queryFn: () => getDebts({ search: search || undefined, page }),
  })

  const rows = data?.data ?? []
  const totalDebt = data?.global_outstanding ?? 0

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ExclamationCircleIcon className="h-6 w-6 text-red-400" />
          <h1 className="text-xl font-bold text-gray-900">Créances clients</h1>
        </div>
        {data && data.total > 0 && (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm ring-1 ring-red-100">
            <span className="text-red-500">Total dû : </span>
            <span className="font-bold text-red-700">{formatCurrency(totalDebt)}</span>
            <span className="ml-2 text-red-400">· {data.total} client(s)</span>
          </div>
        )}
      </div>

      {/* Recherche */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Nom ou téléphone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      </div>

      {/* Tableau */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Téléphone</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Ventes impayées</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Solde dû</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-4 py-3"><SkeletonRow /></td>
                    </tr>
                  ))
                : rows.length === 0
                ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center">
                      <ExclamationCircleIcon className="mx-auto h-8 w-8 text-gray-200 mb-2" />
                      <p className="text-sm text-gray-400">Aucune créance en cours.</p>
                    </td>
                  </tr>
                )
                : rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/customers/${row.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600 select-none">
                          {row.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{row.name}</p>
                          {row.email && <p className="text-xs text-gray-400">{row.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{row.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                        {row.unpaid_sales_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      {formatCurrency(row.outstanding_balance)}
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
              total={data.total}
              perPage={data.per_page}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
