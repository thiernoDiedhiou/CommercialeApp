import { useState, useRef, forwardRef } from 'react'
import { cn } from '@/lib/utils'

const INTEGER_CURRENCIES = new Set(['XOF', 'XAF', 'GNF'])

/** Supprime tous les espaces (y compris non-secables) et reformate avec separateurs. */
function normalizeDisplay(raw: string | number | null | undefined, isInt: boolean): string {
  if (raw == null || raw === '') return ''
  const str = String(raw).replace(/[\s  ]/g, '').replace(',', '.')

  if (isInt) {
    const digits = str.replace(/[^\d]/g, '')
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  const [intPart = '', decPart] = str.split('.')
  const fmtInt = intPart.replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return decPart !== undefined
    ? `${fmtInt}.${decPart.replace(/[^\d]/g, '').slice(0, 2)}`
    : fmtInt
}

function parseRaw(str: string, isInt: boolean): number | null {
  const clean = str.replace(/[\s  ]/g, '').replace(',', '.')
  const n = isInt ? parseInt(clean, 10) : parseFloat(clean)
  return isNaN(n) ? null : n
}

interface PriceInputProps {
  value?        : number | null
  onChange?     : (value: number | null) => void
  onBlur?       : () => void
  currency?     : string
  placeholder?  : string
  disabled?     : boolean
  error?        : boolean
  dark?         : boolean
  /** Variante compacte pour les tableaux de lignes (POS, factures, achats). */
  compact?      : boolean
  className?    : string
  name?         : string
  'aria-label'? : string
  'aria-describedby'? : string
}

const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(({
  value,
  onChange,
  onBlur,
  currency    = 'XOF',
  placeholder = '0',
  disabled    = false,
  error       = false,
  dark        = false,
  compact     = false,
  className,
  name,
  'aria-label'       : ariaLabel,
  'aria-describedby' : ariaDescribedby,
}, ref) => {
  const isInt = INTEGER_CURRENCIES.has(currency)

  const [display, setDisplay] = useState(() => normalizeDisplay(value, isInt))

  // Synchronisation de la valeur externe (ex: reset() de React Hook Form).
  // On le fait pendant le rendu (pas dans useEffect) pour eviter le flash
  // d'affichage non formate avant que l'effet ne se declenche.
  const lastSyncedValue = useRef<number | null | undefined>(value)

  if (lastSyncedValue.current !== value) {
    lastSyncedValue.current = value
    setDisplay(normalizeDisplay(value, isInt))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw    = e.target.value
    const parsed = parseRaw(raw, isInt)
    // On pre-marque la valeur numerique sortante pour que la verification
    // ci-dessus l'ignore au prochain rendu du Controller.
    lastSyncedValue.current = parsed
    setDisplay(normalizeDisplay(raw, isInt))
    onChange?.(parsed)
  }

  const handleBlur = () => {
    setDisplay(d => normalizeDisplay(d, isInt))
    onBlur?.()
  }

  return (
    <input
      ref={ref}
      name={name}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      type="text"
      inputMode={isInt ? 'numeric' : 'decimal'}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'tabular-nums transition focus:outline-none',
        compact
          ? 'w-24 rounded border px-1.5 py-0.5 text-xs focus:ring-0'
          : 'w-full rounded-lg border px-3 py-2 text-sm focus:ring-1',
        dark ? [
          'border-gray-700 bg-gray-800 text-white placeholder-gray-500',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'focus:border-indigo-500 focus:ring-indigo-500',
          disabled && 'cursor-not-allowed bg-gray-900 text-gray-600',
        ] : [
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
            : compact
              ? 'border-gray-200 text-gray-600 focus:border-brand-primary'
              : 'border-gray-300 focus:border-brand-primary focus:ring-brand-primary',
          disabled && 'cursor-not-allowed bg-gray-50 text-gray-400',
        ],
        className,
      )}
    />
  )
})

PriceInput.displayName = 'PriceInput'
export default PriceInput
