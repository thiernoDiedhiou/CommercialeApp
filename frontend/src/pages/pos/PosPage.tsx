import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, UserIcon, TrashIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

import { useCartStore } from '@/store/cartStore'
import type { Product, ProductVariant, Customer } from '@/types'
import { formatCurrency } from '@/lib/utils'

import { getCategories } from '@/services/api/categories'
import { getCustomers } from '@/services/api/customers'
import {
  getPosProducts,
  getCurrentSession,
  createPosSale,
  type CreateSalePayload,
} from '@/services/api/pos'

import { ProductCard } from '@/components/pos/ProductCard'
import { CartItemRow } from '@/components/pos/CartItemRow'
import { OfflineBanner } from '@/components/pos/OfflineBanner'
import { VariantModal } from '@/components/pos/VariantModal'
import { WeightModal } from '@/components/pos/WeightModal'
import { PaymentModal } from '@/components/pos/PaymentModal'

export default function PosPage() {
  const navigate = useNavigate()

  // ── Cart store ───────────────────────────────────────────────────────────
  const items = useCartStore((s) => s.items)
  const discountType = useCartStore((s) => s.discountType)
  const discountValue = useCartStore((s) => s.discountValue)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const updateDiscount = useCartStore((s) => s.updateDiscount)
  const setGlobalDiscount = useCartStore((s) => s.setGlobalDiscount)
  const clearCart = useCartStore((s) => s.clearCart)
  const subtotal = useCartStore((s) => s.subtotal)
  const discountAmount = useCartStore((s) => s.discountAmount)
  const total = useCartStore((s) => s.total)
  const addToOfflineQueue = useCartStore((s) => s.addToOfflineQueue)

  // ── Local state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [variantProduct, setVariantProduct] = useState<Product | null>(null)
  const [weightProduct, setWeightProduct] = useState<Product | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [note, setNote] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const customerRef = useRef<HTMLDivElement>(null)

  // Debounce product search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Ferme le dropdown client au clic extérieur en vidant la recherche
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setCustomerSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['pos-products', debouncedSearch, categoryId],
    queryFn: () =>
      getPosProducts({
        search: debouncedSearch || undefined,
        category_id: categoryId ?? undefined,
      }),
  })

  const { data: session } = useQuery({
    queryKey: ['pos-session'],
    queryFn: getCurrentSession,
    retry: false,
  })

  const { data: customerPage } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: () => getCustomers({ search: customerSearch }),
    enabled: customerSearch.length >= 2,
  })
  const customerResults = customerPage?.data ?? []

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleProductClick = (product: Product) => {
    if (product.has_variants) {
      setVariantProduct(product)
    } else if (product.is_weight_based) {
      setWeightProduct(product)
    } else {
      addItem(product)
    }
  }

  const handleVariantSelect = (product: Product, variant: ProductVariant) => {
    if (variant.is_active && variant.stock_quantity > 0) {
      addItem(product, variant)
    }
    setVariantProduct(null)
  }

  const handleWeightConfirm = (product: Product, weight: number) => {
    addItem(product, null, weight)
  }

  const handlePaymentConfirm = async (
    payments: { method: string; amount: number; reference?: string }[],
  ) => {
    const payload: CreateSalePayload = {
      items: items.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id ?? null,
        quantity: item.quantity,
        ...(item.unit_weight !== null ? { unit_weight: item.unit_weight } : {}),
        unit_price: item.unit_price,
        ...(item.discount > 0 ? { discount: item.discount } : {}),
      })),
      payments,
      customer_id: selectedCustomer?.id ?? null,
      discount_type: discountValue > 0 ? discountType : null,
      ...(discountValue > 0 ? { discount_value: discountValue } : {}),
      ...(note ? { note } : {}),
      session_id: session?.id ?? null,
    }

    try {
      await createPosSale(payload)
      clearCart()
      setSelectedCustomer(null)
      setNote('')
      setPaymentOpen(false)
    } catch (e) {
      // Network failure → save offline
      if (!navigator.onLine || (axios.isAxiosError(e) && !e.response)) {
        addToOfflineQueue({
          offline_id: crypto.randomUUID(),
          items: payload.items.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id ?? null,
            quantity: item.quantity,
            unit_weight: item.unit_weight ?? null,
            unit_price: item.unit_price,
            discount: item.discount ?? 0,
          })),
          payments,
          discount_type: payload.discount_type ?? null,
          discount_value: payload.discount_value ?? 0,
          customer_id: payload.customer_id ?? null,
          note: payload.note ?? null,
          queued_at: new Date().toISOString(),
        })
        clearCart()
        setPaymentOpen(false)
        return
      }
      throw e
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-gray-100 overflow-hidden">
      <OfflineBanner />

      {/* Header */}
      <header className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label="Retour au tableau de bord"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-base font-semibold text-gray-800">Caisse POS</h1>
          {session ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Session ouverte
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              Pas de session
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Vider le panier ?')) clearCart()
            }}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Vider
          </button>
        )}
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Product browser ────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Search + categories */}
          <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-3 space-y-2">
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit ou scanner un code-barres…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white transition"
              autoFocus
            />
            <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]">
              <button
                onClick={() => setCategoryId(null)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                  categoryId === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                    categoryId === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {productsLoading ? (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-xl bg-gray-200" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                {search ? 'Aucun produit pour cette recherche' : 'Aucun produit disponible'}
              </div>
            ) : (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} onClick={handleProductClick} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart panel ────────────────────────────────────────── */}
        <div className="flex w-[380px] shrink-0 flex-col bg-white border-l border-gray-200 overflow-hidden">
          {/* Customer selector */}
          <div className="shrink-0 border-b border-gray-100 px-4 py-3" ref={customerRef}>
            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
                <UserIcon className="h-4 w-4 text-gray-400 shrink-0" />
                {selectedCustomer ? (
                  <div className="flex flex-1 items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{selectedCustomer.name}</span>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null)
                        setCustomerSearch('')
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 transition"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Rechercher un client…"
                    className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
                  />
                )}
              </div>

              {customerSearch.length >= 2 && !selectedCustomer && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                  {customerResults.length > 0 ? (
                    customerResults.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setCustomerSearch('')
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
                      >
                        <UserIcon className="h-4 w-4 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.name}</p>
                          {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">
                      Aucun client trouvé
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {items.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-gray-400">
                <p className="text-sm">Panier vide</p>
                <p className="mt-1 text-xs">Cliquez sur un produit pour l'ajouter</p>
              </div>
            ) : (
              items.map((item, i) => (
                <CartItemRow
                  key={i}
                  item={item}
                  index={i}
                  onRemove={removeItem}
                  onUpdateQty={updateQuantity}
                  onUpdateDiscount={updateDiscount}
                />
              ))
            )}
          </div>

          {/* Discount + totals + encaisser */}
          {items.length > 0 && (
            <div className="shrink-0 border-t border-gray-100 px-4 py-3 space-y-3">
              {/* Global discount */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 shrink-0">Remise globale</span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                  <button
                    onClick={() => setGlobalDiscount('percent', discountValue)}
                    className={`px-2 py-1 transition ${
                      discountType === 'percent'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => setGlobalDiscount('fixed', discountValue)}
                    className={`px-2 py-1 transition ${
                      discountType === 'fixed'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    FCFA
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  value={discountValue || ''}
                  placeholder="0"
                  onChange={(e) => setGlobalDiscount(discountType, parseFloat(e.target.value) || 0)}
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right"
                />
              </div>

              {/* Note */}
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optionnel)"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-indigo-300 transition"
              />

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Sous-total</span>
                  <span>{formatCurrency(subtotal())}</span>
                </div>
                {discountAmount() > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Remise</span>
                    <span>− {formatCurrency(discountAmount())}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-100 pt-1.5">
                  <span>Total</span>
                  <span className="text-indigo-700">{formatCurrency(total())}</span>
                </div>
              </div>

              {/* Encaisser */}
              <button
                onClick={() => setPaymentOpen(true)}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                Encaisser — {formatCurrency(total())}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <VariantModal
        product={variantProduct}
        onSelect={handleVariantSelect}
        onClose={() => setVariantProduct(null)}
      />
      <WeightModal
        product={weightProduct}
        onConfirm={handleWeightConfirm}
        onClose={() => setWeightProduct(null)}
      />
      <PaymentModal
        isOpen={paymentOpen}
        total={total()}
        customerName={selectedCustomer?.name}
        onConfirm={handlePaymentConfirm}
        onClose={() => setPaymentOpen(false)}
      />
    </div>
  )
}
