import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  lastPage: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
  className?: string
}

/** Calcule la séquence de pages à afficher avec ellipses si nécessaire. */
function pageRange(current: number, last: number): (number | '...')[] {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1)
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', last]
  }
  if (current >= last - 3) {
    return [1, '...', last - 4, last - 3, last - 2, last - 1, last]
  }
  return [1, '...', current - 1, current, current + 1, '...', last]
}

export default function Pagination({
  currentPage,
  lastPage,
  total,
  perPage,
  onPageChange,
  className,
}: PaginationProps) {
  if (lastPage <= 1) return null

  const from = (currentPage - 1) * perPage + 1
  const to   = Math.min(currentPage * perPage, total)
  const pages = pageRange(currentPage, lastPage)

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* Résumé */}
      <p className="text-sm text-gray-500">
        {from}–{to} sur {total} résultats
      </p>

      {/* Navigation */}
      <nav className="flex items-center gap-1" aria-label="Pagination">
        {/* Précédent */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Page précédente"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        {/* Pages */}
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-sm text-gray-400">
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? 'page' : undefined}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors',
                page === currentPage
                  ? 'bg-brand-primary text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-50',
              )}
            >
              {page}
            </button>
          ),
        )}

        {/* Suivant */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === lastPage}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Page suivante"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </nav>
    </div>
  )
}
