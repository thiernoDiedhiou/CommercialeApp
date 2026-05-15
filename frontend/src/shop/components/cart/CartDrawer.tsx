import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { XMarkIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useShopStore } from '@/shop/store/shopStore'
import CartItem from './CartItem'
import CheckoutModal from './CheckoutModal'

export default function CartDrawer() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate      = useNavigate()

  const isCartOpen = useShopStore((s) => s.isCartOpen)
  const closeCart  = useShopStore((s) => s.closeCart)
  const items      = useShopStore((s) => s.items)
  const subtotal   = useShopStore((s) => s.subtotal)
  const isEmpty    = useShopStore((s) => s.isEmpty)

  // Placeholder — sera remplacé par le vrai CheckoutModal à l'Étape 13
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  if (!isCartOpen) return null

  return (
    <>
      {/* ── Overlay ──────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* ── Panneau ──────────────────────────────────────────────────────── */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-full sm:max-w-sm bg-white flex flex-col shadow-2xl transition-transform duration-300 ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 text-base">Mon panier</h2>
            {itemCount > 0 && (
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full text-[11px] font-bold text-white px-1 bg-[var(--shop-primary,#111827)]"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Fermer le panier"
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4">
          {isEmpty() ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <ShoppingCartIcon className="h-12 w-12 text-gray-300" />
              <p className="text-gray-500 text-sm">Votre panier est vide</p>
              <button
                type="button"
                onClick={() => { closeCart(); navigate(`/shop/${slug}/catalog`) }}
                className="mt-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 bg-[var(--shop-primary,#111827)]"
              >
                Voir le catalogue
              </button>
            </div>
          ) : (
            <div className="py-2">
              {items.map((item, index) => (
                <CartItem key={index} item={item} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEmpty() && (
          <div className="border-t border-gray-100 px-4 py-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-gray-600">Sous-total</span>
              <span className="text-base font-semibold text-gray-900">
                {Math.round(subtotal()).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Livraison calculée à la commande
            </p>

            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full h-12 rounded-xl mt-4 text-white font-semibold text-base transition-opacity hover:opacity-90 bg-[var(--shop-primary,#111827)]"
            >
              Commander
            </button>

            <button
              type="button"
              onClick={closeCart}
              className="w-full text-sm text-gray-500 text-center mt-2 py-1 hover:text-gray-700 transition-colors"
            >
              Continuer mes achats
            </button>
          </div>
        )}
      </div>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </>
  )
}
