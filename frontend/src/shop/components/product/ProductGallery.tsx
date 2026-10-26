import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { ProductImage } from '@/types'

interface Props {
  images      : ProductImage[]
  imageUrl    : string | null
  productName : string
}

export default function ProductGallery({ images, imageUrl, productName }: Props) {
  // Normalise la liste d'images : priorité à la galerie, sinon image_url seule
  const slides = images.length > 0
    ? images
    : imageUrl
      ? [{ uid: 'main', url: imageUrl, sort_order: 0 }]
      : []

  const [activeIdx, setActiveIdx] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchEndX   = useRef<number | null>(null)

  const prev = useCallback(() =>
    setActiveIdx((i) => (i - 1 + slides.length) % slides.length),
  [slides.length])

  const next = useCallback(() =>
    setActiveIdx((i) => (i + 1) % slides.length),
  [slides.length])

  // Navigation clavier
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
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const delta = touchStartX.current - touchEndX.current
    if (Math.abs(delta) > 40) delta > 0 ? next() : prev()
    touchStartX.current = null
    touchEndX.current   = null
  }

  const current = slides[activeIdx]
  const hasMany  = slides.length > 1

  return (
    <div className="flex flex-col gap-3 select-none">

      {/* ── Image principale ─────────────────────────────────────────────── */}
      <div
        className="relative aspect-square sm:aspect-[4/3] lg:aspect-square w-full overflow-hidden rounded-2xl bg-gray-50"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {current ? (
          <img
            key={current.uid}
            src={current.url}
            alt={productName}
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover transition-opacity duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="text-6xl font-bold text-gray-300 select-none">
              {productName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Boutons prev/next — visibles uniquement si > 1 image */}
        {hasMany && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Image précédente"
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Image suivante"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-700" />
            </button>
          </>
        )}

        {/* Compteur discret */}
        {hasMany && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white tabular-nums backdrop-blur-sm">
            {activeIdx + 1} / {slides.length}
          </span>
        )}
      </div>

      {/* ── Miniatures (desktop ≥ 5 cols, scrollable) ────────────────────── */}
      {hasMany && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {slides.map((img, i) => (
            <button
              key={img.uid}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`Voir image ${i + 1}`}
              className={`shrink-0 h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-xl border-2 transition-all duration-150 ${
                i === activeIdx
                  ? 'border-[var(--shop-primary,#111827)] shadow-md scale-[1.04]'
                  : 'border-transparent opacity-60 hover:opacity-90 hover:border-gray-300'
              }`}
            >
              <img
                src={img.url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Dots mobiles quand < 6 images (complément aux miniatures) */}
      {hasMany && slides.length <= 5 && (
        <div className="flex justify-center gap-1.5 sm:hidden">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === activeIdx
                  ? 'w-4 bg-[var(--shop-primary,#111827)]'
                  : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
