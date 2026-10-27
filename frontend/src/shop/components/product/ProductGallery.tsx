import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { ProductImage } from '@/types'

interface Props {
  images        : ProductImage[]
  imageUrl      : string | null
  productName   : string
  promoPercent? : number | null
  inStock?      : boolean | null
  lowStockQty?  : number | null
}

export default function ProductGallery({
  images,
  imageUrl,
  productName,
  promoPercent = null,
  inStock      = null,
  lowStockQty  = null,
}: Props) {
  const slides = images.length > 0
    ? images
    : imageUrl
      ? [{ uid: 'main', url: imageUrl, sort_order: 0 }]
      : []

  const [activeIdx, setActiveIdx]   = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchEndX   = useRef<number | null>(null)

  const prev = useCallback(() =>
    setActiveIdx((i) => (i - 1 + slides.length) % slides.length),
  [slides.length])

  const next = useCallback(() =>
    setActiveIdx((i) => (i + 1) % slides.length),
  [slides.length])

  useEffect(() => {
    if (slides.length <= 1) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [slides.length, prev, next])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current   = null
  }
  const handleTouchMove  = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX }
  const handleTouchEnd   = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const delta = touchStartX.current - touchEndX.current
    if (Math.abs(delta) > 40) delta > 0 ? next() : prev()
    touchStartX.current = null; touchEndX.current = null
  }

  const current = slides[activeIdx]
  const hasMany  = slides.length > 1

  return (
    <div className="flex flex-col gap-3 select-none">

      {/* ── Cadre principal ──────────────────────────────────────────────── */}
      <div
        className="relative bg-slate-50 rounded-2xl overflow-hidden shadow-sm"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Badges flottants — haut gauche */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          {promoPercent !== null && (
            <span className="bg-rose-500 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-sm tracking-wide">
              -{promoPercent}% PROMO
            </span>
          )}
          {inStock === true && (
            <span className="bg-emerald-600/90 backdrop-blur text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-200" />
              En stock
            </span>
          )}
          {lowStockQty !== null && lowStockQty > 0 && (
            <span className="bg-orange-500/90 backdrop-blur text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-200" />
              Plus que {lowStockQty}
            </span>
          )}
        </div>

        {/* Image principale */}
        <div className="w-full h-72 sm:h-80 flex items-center justify-center p-6 relative">
          {current ? (
            <img
              key={current.uid}
              src={current.url}
              alt={productName}
              loading="eager"
              decoding="async"
              className="w-full h-full object-contain transition-all duration-300 drop-shadow-md"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-7xl font-bold text-slate-200 select-none">
                {productName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Navigation prev/next */}
        {hasMany && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Image précédente"
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95"
            >
              <ChevronLeftIcon className="h-5 w-5 text-slate-700" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Image suivante"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95"
            >
              <ChevronRightIcon className="h-5 w-5 text-slate-700" />
            </button>
          </>
        )}

        {/* Dots indicators */}
        {hasMany && (
          <div className="flex justify-center items-center gap-1.5 pb-3">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === activeIdx
                    ? 'w-5 h-1.5 bg-[var(--shop-primary,#006948)]'
                    : 'w-1.5 h-1.5 bg-slate-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Strip de miniatures ──────────────────────────────────────────── */}
      {hasMany && (
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide py-0.5">
          {slides.map((img, i) => (
            <button
              key={img.uid}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`Vue ${i + 1}`}
              className={`shrink-0 w-16 h-16 rounded-xl bg-slate-100 p-1 transition-all ${
                i === activeIdx
                  ? 'bg-emerald-50 shadow-sm ring-2 ring-[var(--shop-primary,#006948)]'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img.url}
                alt=""
                loading="lazy"
                className="w-full h-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
