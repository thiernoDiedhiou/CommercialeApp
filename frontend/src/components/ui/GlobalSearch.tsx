import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ShoppingBagIcon,
  UsersIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline'
import apiClient, { API } from '@/lib/axios'
import type { Product, Customer, Sale, PaginatedResponse } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface SearchResults {
  products:  Product[]
  customers: Customer[]
  sales:     Sale[]
}

const EMPTY: SearchResults = { products: [], customers: [], sales: [] }

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function GlobalSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)

  const inputRef     = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQ   = useDebounce(query.trim(), 300)

  // Fermeture clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fermeture Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Recherche parallèle
  const search = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = { search: q, per_page: 3, page: 1 }
      const [pRes, cRes, sRes] = await Promise.allSettled([
        apiClient.get<PaginatedResponse<Product>>(`${API}/products`,  { params }),
        apiClient.get<PaginatedResponse<Customer>>(`${API}/customers`, { params }),
        apiClient.get<PaginatedResponse<Sale>>(`${API}/sales`,        { params }),
      ])
      setResults({
        products:  pRes.status === 'fulfilled' ? pRes.value.data.data  : [],
        customers: cRes.status === 'fulfilled' ? cRes.value.data.data  : [],
        sales:     sRes.status === 'fulfilled' ? sRes.value.data.data  : [],
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debouncedQ.length >= 2) {
      setOpen(true)
      search(debouncedQ)
    } else {
      setResults(EMPTY)
      setOpen(false)
    }
  }, [debouncedQ, search])

  const total = results.products.length + results.customers.length + results.sales.length

  const goTo = (href: string) => {
    navigate(href)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-lg mx-auto">
      {/* Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (debouncedQ.length >= 2) setOpen(true) }}
          placeholder={t('common.search_placeholder', 'Rechercher une vente, un produit, un client...')}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 py-2 pl-9 pr-8 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-primary focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-primary transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults(EMPTY); setOpen(false); inputRef.current?.focus() }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown résultats */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 shadow-xl">

          {loading && (
            <p className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400">
              {t('common.searching', 'Recherche en cours…')}
            </p>
          )}

          {!loading && total === 0 && (
            <p className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400">
              {t('common.no_results', 'Aucun résultat pour « {{q}} »', { q: debouncedQ })}
            </p>
          )}

          {/* ── Produits ── */}
          {results.products.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 px-4 pt-2 pb-1">
                <ShoppingBagIcon className="h-3 w-3 text-slate-400 dark:text-gray-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                  {t('nav.products', 'Produits')}
                </span>
              </div>
              {results.products.map((p) => (
                <button
                  key={p.uid}
                  type="button"
                  onClick={() => goTo(`/products/${p.uid}`)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-gray-700/40"
                >
                  {(p as Product & { image_url?: string }).image_url ? (
                    <img
                      src={(p as Product & { image_url?: string }).image_url}
                      alt={p.name}
                      className="h-8 w-8 shrink-0 rounded-lg border border-slate-200 dark:border-gray-600 object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 dark:border-gray-600 bg-slate-100 dark:bg-gray-700 text-xs font-bold text-slate-400 dark:text-gray-500">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-gray-200">{p.name}</p>
                    {p.sku && <p className="text-[11px] text-slate-400 dark:text-gray-500">SKU {p.sku}</p>}
                  </div>
                  <span className="shrink-0 text-xs font-bold text-slate-700 dark:text-gray-300">{formatCurrency(Number(p.price))}</span>
                </button>
              ))}
            </section>
          )}

          {/* ── Clients ── */}
          {results.customers.length > 0 && (
            <section className={results.products.length > 0 ? 'mt-1 border-t border-slate-100 dark:border-gray-700/60 pt-1' : ''}>
              <div className="flex items-center gap-1.5 px-4 pt-2 pb-1">
                <UsersIcon className="h-3 w-3 text-slate-400 dark:text-gray-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                  {t('nav.customers', 'Clients')}
                </span>
              </div>
              {results.customers.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  onClick={() => goTo(`/customers/${c.uid}`)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-gray-700/40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-gray-200">{c.name}</p>
                    {c.phone && <p className="text-[11px] text-slate-400 dark:text-gray-500">{c.phone}</p>}
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* ── Ventes ── */}
          {results.sales.length > 0 && (
            <section className={(results.products.length > 0 || results.customers.length > 0) ? 'mt-1 border-t border-slate-100 dark:border-gray-700/60 pt-1' : ''}>
              <div className="flex items-center gap-1.5 px-4 pt-2 pb-1">
                <ReceiptPercentIcon className="h-3 w-3 text-slate-400 dark:text-gray-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                  {t('nav.sales', 'Ventes')}
                </span>
              </div>
              {results.sales.map((s) => (
                <button
                  key={s.uid}
                  type="button"
                  onClick={() => goTo(`/sales/${s.uid}`)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-gray-700/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-brand-primary">{s.reference}</p>
                    {s.customer && (
                      <p className="text-[11px] text-slate-400 dark:text-gray-500">{s.customer.name}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-bold text-slate-700 dark:text-gray-300">{formatCurrency(Number(s.total))}</span>
                </button>
              ))}
            </section>
          )}

          {/* Voir tous les résultats */}
          {!loading && total > 0 && (
            <div className="mt-1 border-t border-slate-100 dark:border-gray-700/60 px-4 pt-2 pb-1">
              <button
                type="button"
                onClick={() => goTo(`/sales?search=${encodeURIComponent(debouncedQ)}`)}
                className="text-xs font-semibold text-brand-primary hover:opacity-80 transition"
              >
                {t('common.view_all_results', 'Voir tous les résultats pour « {{q}} »', { q: debouncedQ })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
