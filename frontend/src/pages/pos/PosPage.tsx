import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, UserIcon, TrashIcon, ShoppingCartIcon, CameraIcon } from '@heroicons/react/24/outline'
import axios from 'axios'
import { useTranslation } from 'react-i18next'

import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useTenantStore } from '@/store/tenantStore'
import { useThemeStore } from '@/store/themeStore'
import { useExitPosPath } from '@/hooks/useHomePath'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Product, ProductVariant, Customer } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { generateUUID } from '@/lib/uuid'

import PriceInput from '@/components/ui/PriceInput'
import { getCategories } from '@/services/api/categories'
import { getCustomers } from '@/services/api/customers'
import {
  getPosProducts,
  getCurrentSession,
  createPosSale,
  type CreateSalePayload,
} from '@/services/api/pos'
import { toast } from '@/store/toastStore'

import { ProductCard } from '@/components/pos/ProductCard'
import { CartItemRow } from '@/components/pos/CartItemRow'
import { OfflineBanner } from '@/components/pos/OfflineBanner'
import { VariantModal } from '@/components/pos/VariantModal'
import { WeightModal } from '@/components/pos/WeightModal'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { ReceiptModal, type SaleReceipt } from '@/components/pos/ReceiptModal'
import { BarcodeScannerModal } from '@/components/pos/BarcodeScannerModal'
import { SessionModal } from '@/components/pos/SessionModal'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

export default function PosPage() {
  const { t } = useTranslation()
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const exitPosPath = useExitPosPath()
  const isMobile    = useIsMobile()

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
  const tenant           = useAuthStore((s) => s.tenant)
  const user             = useAuthStore((s) => s.user)
  const applyBrandColors = useTenantStore((s) => s.applyBrandColors)
  const applyTheme       = useThemeStore((s) => s.applyTheme)

  // Réapplique les variables CSS brand et le thème au rechargement direct sur /pos (hors Layout)
  useEffect(() => {
    applyTheme()
    if (tenant) applyBrandColors(tenant.primary_color, tenant.secondary_color)
  }, [tenant, applyBrandColors, applyTheme])

  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products')
  const [sessionModal, setSessionModal] = useState<'open' | 'close' | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [variantProduct, setVariantProduct] = useState<Product | null>(null)
  const [weightProduct, setWeightProduct] = useState<Product | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [clearOpen, setClearOpen]     = useState(false)
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
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
      if (isMobile) setMobileView('cart')
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
    // Snapshot avant clearCart
    const itemsSnapshot = [...items]
    const subtotalSnapshot = subtotal()
    const discountAmountSnapshot = discountAmount()
    const totalSnapshot = total()
    const customerSnapshot = selectedCustomer
    const noteSnapshot = note

    const payload: CreateSalePayload = {
      items: itemsSnapshot.map((item) => ({
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
      const sale = await createPosSale(payload)
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      clearCart()
      setSelectedCustomer(null)
      setNote('')
      setPaymentOpen(false)
      setReceipt({
        reference: sale?.data?.reference ?? sale?.reference ?? '—',
        items: itemsSnapshot,
        payments,
        customer: customerSnapshot,
        subtotal: subtotalSnapshot,
        discountAmount: discountAmountSnapshot,
        total: totalSnapshot,
        note: noteSnapshot,
        tenantName: tenant?.name ?? '',
        tenantLogoUrl: tenant?.logo_url ?? null,
        tenantRccm: tenant?.rccm ?? null,
        tenantNinea: tenant?.ninea ?? null,
        cashierName: user?.name ?? '',
        soldAt: formatDateTime(new Date().toISOString()),
      })
    } catch (e) {
      // Network failure → save offline
      if (!navigator.onLine || (axios.isAxiosError(e) && !e.response)) {
        addToOfflineQueue({
          offline_id: generateUUID(),
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

  // ── Scan code-barres → ajout direct au panier ────────────────────────────
  const handleScan = async (barcode: string) => {
    try {
      let results = await getPosProducts({ search: barcode })
      // EAN-13 → UPC-A : certains lecteurs suppriment le zéro de tête sur 12 chiffres
      if (results.length === 0 && /^\d{12}$/.test(barcode)) {
        results = await getPosProducts({ search: `0${barcode}` })
      }
      if (results.length === 1) {
        handleProductClick(results[0])
        toast.success(t('pos.item_added', { name: results[0].name }))
      } else if (results.length === 0) {
        toast.error(t('pos.scan_not_found', { barcode }))
      } else {
        // Plusieurs résultats → afficher dans la grille pour sélection manuelle
        setSearch(barcode)
      }
    } catch {
      setSearch(barcode)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <OfflineBanner />

      {/* Header */}
      <header className="flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          {exitPosPath && (
            <button
              type="button"
              onClick={() => navigate(exitPosPath)}
              aria-label="Retour"
              className="rounded-lg p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          <h1 className="text-base font-semibold text-gray-800 dark:text-gray-200">{t('pos.title')}</h1>
          {session ? (
            <button
              type="button"
              onClick={() => setSessionModal('close')}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700 hover:bg-green-200 transition"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {t('pos.session_open_close')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSessionModal('open')}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200 transition"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {t('pos.open_session_btn')}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setClearOpen(true)}
              className="hidden md:flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              {t('pos.clear_cart_btn')}
            </button>
          )}
          {/* Mobile: cart toggle button */}
          <button
            type="button"
            onClick={() => setMobileView(mobileView === 'cart' ? 'products' : 'cart')}
            aria-label={mobileView === 'cart' ? t('pos.see_products') : t('pos.see_cart')}
            className="relative md:hidden rounded-lg p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            {items.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                {items.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Product browser ────────────────────────────────────── */}
        <div className={`overflow-hidden ${mobileView === 'cart' ? 'hidden md:flex md:flex-col md:flex-1' : 'flex flex-col flex-1'}`}>
          {/* Search + categories */}
          <div className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) {
                    e.preventDefault()
                    handleScan(search.trim())
                    setSearch('')
                  }
                }}
                placeholder={t('pos.search_scanner_placeholder')}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 px-4 py-2 text-sm outline-none focus:border-brand-primary focus:bg-white dark:focus:bg-gray-700 transition"
                autoFocus={!isMobile}
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                aria-label="Scanner un code-barres"
                className="shrink-0 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 text-gray-500 dark:text-gray-400 hover:border-brand-primary hover:text-brand-primary transition"
              >
                <CameraIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]">
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                  categoryId === null
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('pos.all_categories_filter')}
              </button>
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                    categoryId === cat.id
                      ? 'bg-brand-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                  <div key={i} className="h-44 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                {search ? t('pos.no_products_search') : t('pos.no_products')}
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
        <div className={`bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden ${mobileView === 'cart' ? 'flex flex-col flex-1 md:flex-none md:w-[380px] md:shrink-0' : 'hidden md:flex md:flex-col md:w-[380px] md:shrink-0'}`}>
          {/* Mobile back button */}
          <div className="md:hidden shrink-0 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-2">
            <button
              type="button"
              onClick={() => setMobileView('products')}
              className="flex items-center gap-1.5 text-sm text-brand-primary font-medium"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {t('pos.back_to_products')}
            </button>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setClearOpen(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                {t('pos.clear_cart_btn')}
              </button>
            )}
          </div>
          {/* Customer selector */}
          <div className="shrink-0 border-b border-gray-100 dark:border-gray-700 px-4 py-3" ref={customerRef}>
            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 px-3 py-2">
                <UserIcon className="h-4 w-4 text-gray-400 shrink-0" />
                {selectedCustomer ? (
                  <div className="flex flex-1 items-center justify-between">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{selectedCustomer.name}</span>
                    <button
                      type="button"
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
                    placeholder={t('pos.search_customer')}
                    className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400 dark:placeholder-gray-500 dark:text-gray-200"
                  />
                )}
              </div>

              {customerSearch.length >= 2 && !selectedCustomer && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                  {customerResults.length > 0 ? (
                    customerResults.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setCustomerSearch('')
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
                      >
                        <UserIcon className="h-4 w-4 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</p>
                          {c.phone && <p className="text-xs text-gray-400 dark:text-gray-500">{c.phone}</p>}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">
                      {t('pos.no_customer_found')}
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
                <p className="text-sm">{t('pos.empty_cart')}</p>
                <p className="mt-1 text-xs">{t('pos.empty_cart_desc')}</p>
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
            <div className="shrink-0 border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-3">
              {/* Global discount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">{t('pos.global_discount')}</span>
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setGlobalDiscount('percent', discountValue)}
                      className={`px-2 py-1 transition ${
                        discountType === 'percent'
                          ? 'bg-brand-primary text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlobalDiscount('fixed', discountValue)}
                      className={`px-2 py-1 transition ${
                        discountType === 'fixed'
                          ? 'bg-brand-primary text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      FCFA
                    </button>
                  </div>
                </div>
                {discountType === 'fixed' ? (
                  <PriceInput
                    value={discountValue || null}
                    onChange={(v) => setGlobalDiscount('fixed', v ?? 0)}
                    currency={tenant?.currency ?? 'XOF'}
                    className="text-right"
                  />
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountValue || ''}
                    placeholder="0"
                    onChange={(e) => setGlobalDiscount('percent', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 text-sm text-right outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                )}
              </div>

              {/* Note */}
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('pos.note_placeholder')}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 px-3 py-1.5 text-xs outline-none focus:border-brand-primary transition"
              />

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>{t('pos.subtotal')}</span>
                  <span>{formatCurrency(subtotal())}</span>
                </div>
                {discountAmount() > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t('common.discount')}</span>
                    <span>− {formatCurrency(discountAmount())}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 dark:text-gray-100 border-t border-gray-100 dark:border-gray-700 pt-1.5">
                  <span>{t('pos.total')}</span>
                  <span className="text-brand-primary">{formatCurrency(total())}</span>
                </div>
              </div>

              {/* Encaisser */}
              <button
                type="button"
                onClick={() => setPaymentOpen(true)}
                className="w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {t('pos.collect_btn', { amount: formatCurrency(total()) })}
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

      <ReceiptModal
        receipt={receipt}
        onClose={() => setReceipt(null)}
      />

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
      />

      <SessionModal
        isOpen={sessionModal !== null}
        mode={sessionModal ?? 'open'}
        session={session}
        currency={tenant?.currency ?? 'XOF'}
        onOpened={(s) => {
          qc.setQueryData(['pos-session'], s)
          setSessionModal(null)
        }}
        onClosed={() => {
          qc.setQueryData(['pos-session'], null)
          setSessionModal(null)
        }}
        onClose={() => setSessionModal(null)}
      />

      <Modal
        isOpen={clearOpen}
        onClose={() => setClearOpen(false)}
        title={t('pos.clear_cart_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setClearOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={() => { clearCart(); setClearOpen(false) }}>
              {t('pos.clear_cart_action')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('pos.clear_cart_text')}
        </p>
      </Modal>
    </div>
  )
}
