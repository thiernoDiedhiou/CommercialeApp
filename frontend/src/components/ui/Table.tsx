import { cn } from '@/lib/utils'
import { SkeletonRow } from './Skeleton'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => React.ReactNode
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
  emptyMessage?: string
  loading?: boolean
  /** Nombre de lignes skeleton affichées pendant le chargement */
  skeletonRows?: number
  className?: string
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
}: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-gray-200 bg-white', className)}>
      <table className="min-w-full divide-y divide-gray-200">
        {/* En-tête */}
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500',
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
        <tbody className="divide-y divide-gray-100 bg-white">
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-sm text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-gray-50',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-sm text-gray-700',
                      alignClasses[col.align ?? 'left'],
                      col.className,
                    )}
                  >
                    {col.render
                      ? col.render(row, index)
                      : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
