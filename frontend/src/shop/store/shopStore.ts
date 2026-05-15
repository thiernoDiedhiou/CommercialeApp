import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Types publics ─────────────────────────────────────────────────────────────

export interface ShopCartItem {
  product_id      : number
  variant_id      : number | null
  product_name    : string
  variant_name    : string | null
  image_url       : string | null
  quantity        : number
  unit_price      : number
  total           : number
  is_weight_based : boolean
  unit            : string | null
}

export interface ShopTheme {
  primary_color   : string
  secondary_color : string
  accent_color    : string
}

export interface DeliveryZone {
  name : string
  fee  : number
}

export interface ShopConfig {
  name                    : string
  description             : string | null
  hero_title              : string | null
  hero_subtitle           : string | null
  hero_banner_url         : string | null
  logo_url                : string | null
  favicon_url             : string | null
  announcement_bar        : string | null
  announcement_bar_active : boolean
  whatsapp_number         : string | null
  facebook_url            : string | null
  instagram_url           : string | null
  twitter_url             : string | null
  address                 : string | null
  opening_hours           : string | null
  footer_text             : string | null
  minimum_order           : number
  payment_methods         : string[]
  delivery_zones          : DeliveryZone[]
}

export interface ShopOrderResult {
  reference    : string
  total        : number
  status       : string
  whatsapp_url : string | null
}

// ── Interface du store ────────────────────────────────────────────────────────

interface ShopState {
  // Config boutique
  shopConfig      : ShopConfig | null
  theme           : ShopTheme | null

  // Panier
  items           : ShopCartItem[]
  isCartOpen      : boolean

  // Checkout
  isCheckingOut   : boolean
  lastOrder       : ShopOrderResult | null

  // ── Actions config ───────────────────────────────────────────────────────
  setConfig       : (config: ShopConfig, theme: ShopTheme) => void

  // ── Actions panier ───────────────────────────────────────────────────────
  addItem         : (item: ShopCartItem) => void
  removeItem      : (index: number) => void
  updateQuantity  : (index: number, qty: number) => void
  clearCart       : () => void

  // ── Actions drawer / checkout ────────────────────────────────────────────
  openCart        : () => void
  closeCart       : () => void
  toggleCart      : () => void
  setIsCheckingOut: (value: boolean) => void
  setLastOrder    : (order: ShopOrderResult | null) => void

  // ── Computed ─────────────────────────────────────────────────────────────
  itemCount       : () => number
  subtotal        : () => number
  isEmpty         : () => boolean
}

// ── Clé de persistence basée sur le slug de l'URL ────────────────────────────
// URL structure : /shop/{slug}/...

function getShopSlugFromUrl(): string {
  const parts = window.location.pathname.split('/')
  // ['', 'shop', 'demo', ...]
  return parts[2] ?? 'default'
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => ({
      // ── State initial ────────────────────────────────────────────────────
      shopConfig      : null,
      theme           : null,
      items           : [],
      isCartOpen      : false,
      isCheckingOut   : false,
      lastOrder       : null,

      // ── Config ───────────────────────────────────────────────────────────

      setConfig: (config, theme) => {
        // Applique les variables CSS pour la charte graphique de la boutique
        const root = document.documentElement
        root.style.setProperty('--shop-primary',   theme.primary_color)
        root.style.setProperty('--shop-secondary', theme.secondary_color)
        root.style.setProperty('--shop-accent',    theme.accent_color)
        set({ shopConfig: config, theme })
      },

      // ── Panier ───────────────────────────────────────────────────────────

      addItem: (item) => {
        const { items } = get()

        // TYPE 2 (poids) → toujours une nouvelle ligne indépendante
        if (item.is_weight_based) {
          set({ items: [...items, item] })
          return
        }

        // TYPE 0 / 1 / 3 → fusionner si même product_id + variant_id
        const existingIndex = items.findIndex(
          (i) =>
            i.product_id === item.product_id &&
            i.variant_id === item.variant_id,
        )

        if (existingIndex !== -1) {
          const updated = [...items]
          const existing = updated[existingIndex]
          const newQty   = existing.quantity + item.quantity
          updated[existingIndex] = {
            ...existing,
            quantity: newQty,
            total   : parseFloat((newQty * existing.unit_price).toFixed(2)),
          }
          set({ items: updated })
        } else {
          set({ items: [...items, item] })
        }
      },

      removeItem: (index) => {
        const updated = get().items.filter((_, i) => i !== index)
        set({ items: updated })
      },

      updateQuantity: (index, qty) => {
        if (qty <= 0) {
          get().removeItem(index)
          return
        }
        const updated = [...get().items]
        updated[index] = {
          ...updated[index],
          quantity: qty,
          total   : parseFloat((qty * updated[index].unit_price).toFixed(2)),
        }
        set({ items: updated })
      },

      clearCart: () => set({ items: [] }),

      // ── Drawer / checkout ─────────────────────────────────────────────────

      openCart        : () => set({ isCartOpen: true }),
      closeCart       : () => set({ isCartOpen: false }),
      toggleCart      : () => set((s) => ({ isCartOpen: !s.isCartOpen })),
      setIsCheckingOut: (value) => set({ isCheckingOut: value }),
      setLastOrder    : (order) => set({ lastOrder: order }),

      // ── Computed ──────────────────────────────────────────────────────────

      itemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      subtotal: () =>
        parseFloat(
          get().items.reduce((sum, item) => sum + item.total, 0).toFixed(2),
        ),

      isEmpty: () => get().items.length === 0,
    }),

    // ── Persist config ────────────────────────────────────────────────────────
    {
      name: `shop-cart-${getShopSlugFromUrl()}`,

      // Ne persiste que le panier et l'état du drawer
      partialize: (state): Pick<ShopState, 'items' | 'isCartOpen'> => ({
        items      : state.items,
        isCartOpen : state.isCartOpen,
      }),
    },
  ),
)
