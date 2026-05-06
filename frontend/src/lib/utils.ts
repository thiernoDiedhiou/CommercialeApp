import { clsx, type ClassValue } from 'clsx'
import { useAuthStore } from '@/store/authStore'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

// Devises sans décimales (Afrique subsaharienne principalement)
const ZERO_DECIMAL_CURRENCIES = new Set([
  'XOF', 'XAF', 'GNF', 'RWF', 'BIF', 'KMF', 'MGA', 'DJF', 'KES', 'UGX', 'TZS',
])

function decimalDigits(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2
}

/**
 * Formate un montant dans la devise du tenant courant.
 * Si `currency` est omis, lit automatiquement `authStore.tenant.currency`.
 * Adapte les décimales selon la devise (XOF/GNF = 0, EUR/USD = 2).
 */
export function formatCurrency(amount: number | string, currency?: string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  const curr  = currency ?? useAuthStore.getState().tenant?.currency ?? 'XOF'
  const dec   = decimalDigits(curr)
  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(value)
}

/** @deprecated Utiliser formatCurrency() sans argument de devise */
export function formatXOF(amount: number | string): string {
  return formatCurrency(amount, 'XOF')
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-SN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-SN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
