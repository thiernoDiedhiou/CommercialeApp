import { useState, useRef, useEffect } from 'react'
import { ChevronDown, MapPin, Building2, Warehouse } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getBranches } from '@/services/api/branches'
import { cn } from '@/lib/utils'
import type { Branch } from '@/types'

const TYPE_ICONS = {
  principal: Building2,
  sync:      MapPin,
  warehouse: Warehouse,
} as const

function BranchIcon({ type, className }: { type: Branch['type']; className?: string }) {
  const Icon = TYPE_ICONS[type]
  return <Icon className={className} aria-hidden="true" />
}

export default function BranchSelector() {
  const activeBranch        = useAuthStore((s) => s.activeBranch)
  const availableBranches   = useAuthStore((s) => s.availableBranches)
  const setActiveBranch     = useAuthStore((s) => s.setActiveBranch)
  const setAvailableBranches = useAuthStore((s) => s.setAvailableBranches)

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const branches = await getBranches()
      setAvailableBranches(branches)
      return branches
    },
    staleTime: 5 * 60 * 1000,
  })

  // Ferme le dropdown au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // N'affiche le sélecteur que s'il y a plusieurs succursales
  if (availableBranches.length <= 1) return null

  return (
    <div ref={ref} className="relative px-3 pb-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm',
          'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600',
          'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {activeBranch && (
          <BranchIcon type={activeBranch.type} className="h-4 w-4 shrink-0 text-brand-primary" />
        )}
        <span className="flex-1 truncate text-left font-medium">
          {activeBranch?.name ?? 'Sélectionner…'}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Succursales"
          className={cn(
            'absolute left-3 right-3 z-50 mt-1 rounded-lg border border-gray-200 dark:border-gray-600',
            'bg-white dark:bg-gray-800 shadow-lg py-1 max-h-52 overflow-y-auto',
          )}
        >
          {availableBranches.map((branch) => (
            <button
              key={branch.uid}
              type="button"
              role="option"
              aria-selected={activeBranch?.uid === branch.uid}
              onClick={() => {
                setActiveBranch(branch)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                activeBranch?.uid === branch.uid
                  ? 'bg-brand-primary/10 text-brand-primary font-medium'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700',
              )}
            >
              <BranchIcon
                type={branch.type}
                className={cn(
                  'h-4 w-4 shrink-0',
                  activeBranch?.uid === branch.uid ? 'text-brand-primary' : 'text-gray-400',
                )}
              />
              <span className="flex-1 truncate text-left">{branch.name}</span>
              {!branch.is_active && (
                <span className="text-xs text-gray-400 italic">inactif</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
