import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton, SkeletonRow } from './Skeleton'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => ReactNode
  /** Classe CSS appliquée aux cellules de cette colonne */
  className?: string
  /** Classe CSS de l'en-tête */
  headerClassName?: string
  align?: 'left' | 'center' | 'right'
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string | number
  onRowClick?: (row: T) => void
  emptyMessage?: ReactNode
  loading?: boolean
  /** Nombre de lignes skeleton affichées pendant le chargement */
  skeletonRows?: number
  className?: string
  /** Rendu en mode carte sur mobile (sm:hidden). Quand fourni, le tableau est masqué sous sm. */
  mobileCard?: (row: T) => ReactNode
}

const alignClasses = { left: 'text-left', center: 'text-center', right: 'text-right' }

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'Aucune donnée disponible.',
  loading = false,
  skeletonRows = 5,
  className,
  mobileCard,
}: TableProps<T>) {
  return (
    <>
      {mobileCard && (
        <div className="sm:hidden divide-y divide-gray-100 bg-white rounded-xl border border-slate-200">
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <div key={i} className="px-4 py-3 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))
          ) : data.length === 0 ? (
            typeof emptyMessage === 'string' ? (
              <p className="py-12 text-center text-sm text-slate-400">{emptyMessage}</p>
            ) : (
              emptyMessage
            )
          ) : (
            data.map((row) => (
              <div
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-gray-50')}
              >
                {mobileCard(row)}
              </div>
            ))
          )}
        </div>
      )}

      <div className={cn(mobileCard ? 'hidden sm:block' : '', 'overflow-x-auto rounded-xl border border-slate-200 bg-white', className)}>
        <table className="min-w-full divide-y divide-slate-200">
          {/* En-tête */}
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400',
                    alignClasses[col.align ?? 'left'],
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Corps */}
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {typeof emptyMessage === 'string' ? (
                    <p className="py-12 text-center text-sm text-slate-400">{emptyMessage}</p>
                  ) : (
                    emptyMessage
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-slate-50',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm text-slate-700',
                        alignClasses[col.align ?? 'left'],
                        col.className,
                      )}
                    >
                      {col.render
                        ? col.render(row, index)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
