import { useState, useEffect } from 'react'

const PRODUCT_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-red-100',    text: 'text-red-600'    },
  2: { bg: 'bg-blue-100',   text: 'text-blue-600'   },
  3: { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  4: { bg: 'bg-pink-100',   text: 'text-pink-600'   },
  5: { bg: 'bg-green-100',  text: 'text-green-700'  },
  6: { bg: 'bg-orange-100', text: 'text-orange-600' },
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const MOCK_PRODUCTS = [
  { id: 1, name: 'Coca-Cola 33cl',   price: 600  },
  { id: 2, name: 'Eau Kirène 1.5L',  price: 500  },
  { id: 3, name: 'Pain de mie',       price: 750  },
  { id: 4, name: 'Sucre 1kg',         price: 800  },
  { id: 5, name: 'Riz Parfumé 5kg',   price: 2500 },
  { id: 6, name: 'Huile Végétale 1L', price: 1200 },
]

const PAYMENT_METHODS = ['Espèces', 'Orange Money', 'Wave']

interface CartItem { id: number; name: string; price: number; qty: number }

export default function PosMockup() {
  const [cart, setCart] = useState<CartItem[]>([
    { id: 1, name: 'Coca-Cola 33cl', price: 600, qty: 2 },
    { id: 3, name: 'Pain de mie',    price: 750, qty: 1 },
  ])
  const [paid, setPaid] = useState(false)

  const add = (p: typeof MOCK_PRODUCTS[0]) => {
    if (paid) { setPaid(false); setCart([{ ...p, qty: 1 }]); return }
    setCart((prev) => {
      const ex = prev.find((c) => c.id === p.id)
      if (ex) return prev.map((c) => c.id === p.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...p, qty: 1 }]
    })
  }

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0)

  useEffect(() => {
    if (!paid) return
    const id = setTimeout(() => { setPaid(false); setCart([]) }, 2000)
    return () => clearTimeout(id)
  }, [paid])

  const handlePay = () => setPaid(true)

  return (
    <div className="flex h-[280px] sm:h-[360px] bg-white overflow-hidden text-left">

      {/* Gauche : grille produits */}
      <div className="w-1/2 border-r border-gray-100 p-2 flex flex-col">
        <p className="text-[8px] font-bold text-gray-400 uppercase mb-1.5 px-0.5">Produits</p>
        <div className="grid grid-cols-2 gap-1 overflow-y-auto flex-1 min-h-0">
          {MOCK_PRODUCTS.map((p) => {
            const col = PRODUCT_COLORS[p.id]
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => add(p)}
                className="flex flex-col items-start gap-0.5 rounded-lg border border-gray-100 p-2 hover:border-ds-blue/50 hover:bg-ds-blue-light/40 transition-all text-left"
              >
                <span className={`h-6 w-6 rounded-md flex items-center justify-center text-[7px] font-black ${col.bg} ${col.text}`}>
                  {initials(p.name)}
                </span>
                <span className="text-[7px] font-semibold text-gray-700 leading-tight line-clamp-2 mt-0.5">{p.name}</span>
                <span className="text-[7px] font-bold text-ds-blue">{p.price.toLocaleString('fr-FR')} F</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Droite : ticket */}
      <div className="w-1/2 flex flex-col p-2">
        <p className="text-[8px] font-bold text-gray-400 uppercase mb-1.5 px-0.5">Ticket en cours</p>

        {paid ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <svg viewBox="0 0 16 16" className="h-4 w-4 text-green-600 fill-current">
                <path d="M13.5 3.5L6 11 2.5 7.5l-1 1L6 13l8.5-8.5-1-1z" />
              </svg>
            </div>
            <p className="text-[9px] font-bold text-ds-green">Paiement reçu !</p>
            <p className="text-[7px] text-gray-400">Nouveau ticket…</p>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[8px] text-gray-300">Ticket vide — cliquez un produit</p>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-1 overflow-y-auto min-h-0">
              {cart.map(({ id, name, price, qty }) => (
                <div key={id} className="flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1">
                  <span className="text-[7px] text-gray-600 truncate flex-1">{name}</span>
                  <span className="text-[6px] text-gray-400 shrink-0">×{qty}</span>
                  <span className="text-[7px] font-bold text-gray-700 shrink-0">{(price * qty).toLocaleString('fr-FR')}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-2 mt-2 shrink-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[8px] text-gray-500">Total</span>
                <span className="text-[11px] font-extrabold text-gray-900">
                  {total.toLocaleString('fr-FR')}{' '}
                  <span className="text-[7px] font-normal text-gray-400">F CFA</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 mb-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={handlePay}
                    className="rounded-md border border-gray-200 py-1 text-[6px] font-semibold text-gray-600 hover:border-ds-blue hover:text-ds-blue transition-all"
                  >
                    {m}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handlePay}
                className="w-full rounded-lg bg-ds-blue py-1.5 text-[8px] font-bold text-white hover:bg-ds-blue-dark transition-all"
              >
                Encaisser →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
