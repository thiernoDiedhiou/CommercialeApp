import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from './authStore'
import type { Product, ProductVariant } from '@/types'

// ── Types publics ─────────────────────────────────────────────────────────

export interface CartItem {
  product: Product
  variant: ProductVariant | null
  quantity: number
  unit_weight: number | null  // non null si is_weight_based
  unit_price: number          // snapshot du prix au moment de l'ajout
  discount: number            // remise en FCFA sur la ligne
}

export interface OfflineSale {
  offline_id: string          // UUID généré côté client
  items: {
    product_id: number
    variant_id: number | null
    quantity: number
    unit_weight: number | null
    unit_price: number
    discount: number
  }[]
  payments: { method: string; amount: number; reference?: string }[]
  discount_type: 'percent' | 'fixed' | null
  discount_value: number
  customer_id: number | null
  note: string | null
  queued_at: string
}

// ── Interface du store ────────────────────────────────────────────────────

interface CartState {
  // ── State ────────────────────────────────────────────────────────────────
  items: CartItem[]
  draftName: string | null
  sessionId: number | null
  discountType: 'percent' | 'fixed'
  discountValue: number
  offlineQueue: OfflineSale[]

  // ── Actions items ────────────────────────────────────────────────────────
  addItem: (
    product: Product,
    variant?: ProductVariant | null,
    unit_weight?: number | null,
  ) => void
  removeItem: (index: number) => void
  updateQuantity: (index: number, qty: number) => void
  updateDiscount: (index: number, discount: number) => void

  // ── Actions globales ─────────────────────────────────────────────────────
  setGlobalDiscount: (type: 'percent' | 'fixed', value: number) => void
  clearCart: () => void
  setDraftName: (name: string | null) => void
  setSessionId: (id: number | null) => void

  // ── Computed ─────────────────────────────────────────────────────────────
  subtotal: () => number
  discountAmount: () => number
  total: () => number
  itemCount: () => number

  // ── Offline queue ─────────────────────────────────────────────────────────
  addToOfflineQueue: (sale: OfflineSale) => void
  removeFromOfflineQueue: (offlineId: string) => void
  clearOfflineQueue: () => void
}

// ── Clé de persistance ────────────────────────────────────────────────────
// Évaluée une seule fois au chargement du module (après login → tenant disponible).

function getCartKey(): string {
  const name = useAuthStore.getState().tenant?.name ?? 'default'
  return `pos-cart-${name.toLowerCase().replace(/\s+/g, '-')}`
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // ── State initial ────────────────────────────────────────────────────
      items: [],
      draftName: null,
      sessionId: null,
      discountType: 'percent',
      discountValue: 0,
      offlineQueue: [],

      // ── addItem ──────────────────────────────────────────────────────────
      // Poids : toujours nouvelle ligne.
      // Sinon : incrémente si même produit+variante existe déjà.
      addItem: (product, variant = null, unit_weight = null) => {
        const price = variant
          ? Number(variant.price)
          : Number(product.price)

        if (unit_weight !== null) {
          // produit au poids → nouvelle ligne systématiquement
          set((s) => ({
            items: [...s.items, { product, variant, quantity: 1, unit_weight, unit_price: price, discount: 0 }],
          }))
          return
        }

        const existing = get().items.findIndex(
          (i) => i.product.id === product.id && (i.variant?.id ?? null) === (variant?.id ?? null),
        )
        if (existing !== -1) {
          set((s) => {
            const items = [...s.items]
            items[existing] = { ...items[existing], quantity: items[existing].quantity + 1 }
            return { items }
          })
        } else {
          set((s) => ({
            items: [...s.items, { product, variant, quantity: 1, unit_weight: null, unit_price: price, discount: 0 }],
          }))
        }
      },

      // ── removeItem ───────────────────────────────────────────────────────
      removeItem: (index) =>
        set((s) => ({ items: s.items.filter((_, i) => i !== index) })),

      // ── updateQuantity ───────────────────────────────────────────────────
      updateQuantity: (index, qty) => {
        if (qty <= 0) { get().removeItem(index); return }
        set((s) => {
          const items = [...s.items]
          items[index] = { ...items[index], quantity: qty }
          return { items }
        })
      },

      // ── updateDiscount ───────────────────────────────────────────────────
      updateDiscount: (index, discount) =>
        set((s) => {
          const items = [...s.items]
          items[index] = { ...items[index], discount: Math.max(0, discount) }
          return { items }
        }),

      // ── setGlobalDiscount ────────────────────────────────────────────────
      setGlobalDiscount: (type, value) =>
        set({ discountType: type, discountValue: Math.max(0, value) }),

      // ── clearCart ────────────────────────────────────────────────────────
      clearCart: () =>
        set({ items: [], draftName: null, discountType: 'percent', discountValue: 0 }),

      // ── setDraftName / setSessionId ──────────────────────────────────────
      setDraftName: (name) => set({ draftName: name }),
      setSessionId: (id) => set({ sessionId: id }),

      // ── Computed ─────────────────────────────────────────────────────────
      subtotal: () =>
        get().items.reduce((sum, item) => {
          const lineTotal = item.unit_price * (item.unit_weight ?? item.quantity)
          return sum + lineTotal - item.discount
        }, 0),

      discountAmount: () => {
        const { discountType, discountValue } = get()
        const sub = get().subtotal()
        return discountType === 'percent'
          ? Math.round((sub * discountValue) / 100)
          : Math.min(discountValue, sub)
      },

      total: () => Math.max(0, get().subtotal() - get().discountAmount()),

      itemCount: () => get().items.length,

      // ── Offline queue ────────────────────────────────────────────────────
      addToOfflineQueue: (sale) =>
        set((s) => ({ offlineQueue: [...s.offlineQueue, sale] })),

      removeFromOfflineQueue: (offlineId) =>
        set((s) => ({ offlineQueue: s.offlineQueue.filter((s) => s.offline_id !== offlineId) })),

      clearOfflineQueue: () => set({ offlineQueue: [] }),
    }),

    {
      name: getCartKey(),
      // N'enregistre que les données — exclut les fonctions du localStorage.
      partialize: (state) => ({
        items: state.items,
        draftName: state.draftName,
        sessionId: state.sessionId,
        discountType: state.discountType,
        discountValue: state.discountValue,
        offlineQueue: state.offlineQueue,
      }),
    },
  ),
)
