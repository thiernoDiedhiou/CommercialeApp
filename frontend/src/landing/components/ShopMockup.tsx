import { useState, useEffect } from 'react'
import { ShoppingCartIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const SHOP_PRODUCTS = [
  { id: 1, name: 'Coca-Cola 33cl',    price: 600,  compareAt: null, emoji: '🥤', stock: 24 },
  { id: 2, name: 'Eau Kirène 1.5L',   price: 500,  compareAt: null, emoji: '💧', stock: 48 },
  { id: 3, name: 'Pain de mie 500g',  price: 750,  compareAt: 900,  emoji: '🍞', stock: 3  },
  { id: 4, name: 'Huile Végétale 1L', price: 1200, compareAt: null, emoji: '🍶', stock: 15 },
]

const CATEGORIES = ['Tous', 'Boissons', 'Épicerie', 'Frais']

export default function ShopMockup() {
  const [activeCategory, setActiveCategory] = useState('Tous')
  const [cartCount, setCartCount]           = useState(2)
  const [added, setAdded]                   = useState<number | null>(null)

  useEffect(() => {
    if (added === null) return
    const id = setTimeout(() => setAdded(null), 800)
    return () => clearTimeout(id)
  }, [added])

  const handleAdd = (id: number) => {
    setCartCount((c) => c + 1)
    setAdded(id)
  }

  return (
    <div className="flex h-[280px] sm:h-[360px] bg-gray-50 overflow-hidden text-left flex-col">

      {/* Navbar boutique */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-ds-blue" />
          <span className="text-[9px] font-extrabold text-gray-800">DiDi Sphere</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1">
            <MagnifyingGlassIcon className="h-2.5 w-2.5 text-gray-400" />
            <span className="text-[7px] text-gray-400">Rechercher…</span>
          </div>
          <div className="relative">
            <ShoppingCartIcon className="h-4 w-4 text-gray-500" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-ds-blue text-[6px] font-bold text-white flex items-center justify-center transition-all">
                {cartCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chips catégories */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-b border-gray-50 overflow-x-auto shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-2.5 py-0.5 text-[7px] font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-ds-blue text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grille produits */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SHOP_PRODUCTS.map(({ id, name, price, compareAt, emoji, stock }) => {
            const discountPct = compareAt ? Math.round((1 - price / compareAt) * 100) : 0
            const isAdded = added === id
            return (
              <div
                key={id}
                className="rounded-xl bg-white border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image placeholder */}
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative">
                  <span className="text-3xl">{emoji}</span>

                  {compareAt && (
                    <span className="absolute top-1 left-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[5px] font-bold text-white">
                      -{discountPct}%
                    </span>
                  )}

                  {stock <= 5 && (
                    <span className="absolute bottom-0 left-0 right-0 text-center bg-orange-500/90 text-[5px] font-semibold text-white py-0.5">
                      Plus que {stock} en stock
                    </span>
                  )}
                </div>

                <div className="p-1.5">
                  <p className="text-[7px] font-medium text-gray-700 truncate mb-0.5">{name}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[9px] font-extrabold text-gray-900">{price.toLocaleString('fr-FR')}</span>
                    {compareAt && (
                      <span className="text-[6px] text-gray-400 line-through">{compareAt.toLocaleString('fr-FR')}</span>
                    )}
                    <span className="text-[5px] text-gray-300 ml-auto">F</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdd(id)}
                    className={`w-full rounded-md py-0.5 text-[6px] font-bold transition-all ${
                      isAdded
                        ? 'bg-ds-green text-white'
                        : 'bg-ds-blue text-white hover:bg-ds-blue-dark'
                    }`}
                  >
                    {isAdded ? '✓ Ajouté' : 'Ajouter'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
