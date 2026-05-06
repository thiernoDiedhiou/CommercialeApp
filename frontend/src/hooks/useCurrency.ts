import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'

export interface CurrencyInfo {
  code:   string   // ex: 'XOF', 'EUR'
  symbol: string   // ex: 'F CFA', '€'
  decimals: number // 0 pour XOF, 2 pour EUR
}

// Devises supportées avec leurs métadonnées
export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'XOF', symbol: 'F CFA',  decimals: 0 },
  { code: 'XAF', symbol: 'F CFA',  decimals: 0 },
  { code: 'GNF', symbol: 'GNF',    decimals: 0 },
  { code: 'EUR', symbol: '€',      decimals: 2 },
  { code: 'USD', symbol: '$',      decimals: 2 },
  { code: 'GBP', symbol: '£',      decimals: 2 },
  { code: 'MAD', symbol: 'MAD',    decimals: 2 },
  { code: 'MRU', symbol: 'MRU',    decimals: 2 },
]

/**
 * Hook réactif qui retourne la devise du tenant courant et un formateur.
 * Re-render automatique si la devise du tenant change.
 */
export function useCurrency() {
  const currency = useAuthStore((s) => s.tenant?.currency ?? 'XOF')
  const info     = SUPPORTED_CURRENCIES.find((c) => c.code === currency)
    ?? { code: currency, symbol: currency, decimals: 0 }

  return {
    currency,
    symbol:   info.symbol,
    decimals: info.decimals,
    format:   (amount: number | string) => formatCurrency(amount, currency),
  }
}
