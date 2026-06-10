interface Props {
  title         : string | null
  subtitle      : string | null
  bannerUrl     : string | null
  onCatalogClick: () => void
}

export default function HeroBanner({ title, subtitle, bannerUrl, onCatalogClick }: Props) {
  if (!title && !bannerUrl) return null

  return (
    <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">

      {/* ── Fond ────────────────────────────────────────────────────────────── */}
      {bannerUrl ? (
        <>
          <img
            src={bannerUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          {/* Couche de base sombre uniforme pour garantir la lisibilité */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Gradient additionnel pour la profondeur */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, var(--shop-primary, #111827) 0%, var(--shop-secondary, #374151) 100%)',
          }}
        />
      )}

      {/* ── Contenu ──────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        {title && (
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight max-w-3xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
            style={{ animation: 'fadeUp 0.6s ease both' }}
          >
            {title}
          </h1>
        )}

        {subtitle && (
          <p
            className="mt-4 text-lg md:text-xl text-white/90 max-w-xl drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]"
            style={{ animation: 'fadeUp 0.6s ease 0.1s both' }}
          >
            {subtitle}
          </p>
        )}

        <button
          type="button"
          onClick={onCatalogClick}
          className="mt-8 px-8 py-3.5 rounded-full font-semibold text-base shadow-xl transition-all duration-200 max-w-xs w-full hover:scale-105 active:scale-95 text-white"
          style={{
            animation   : 'fadeUp 0.6s ease 0.2s both',
            background  : 'var(--shop-primary, #111827)',
            boxShadow   : '0 4px 24px rgba(0,0,0,0.35)',
          }}
        >
          Voir le catalogue →
        </button>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
