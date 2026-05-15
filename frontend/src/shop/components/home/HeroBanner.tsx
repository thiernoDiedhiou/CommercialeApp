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
          {/* Gradient pour lisibilité du texte */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
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
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight max-w-3xl"
            style={{ animation: 'fadeUp 0.6s ease both' }}
          >
            {title}
          </h1>
        )}

        {subtitle && (
          <p
            className="mt-4 text-lg md:text-xl text-white/80 max-w-xl"
            style={{ animation: 'fadeUp 0.6s ease 0.1s both' }}
          >
            {subtitle}
          </p>
        )}

        <button
          type="button"
          onClick={onCatalogClick}
          className="mt-8 px-8 py-3 rounded-full bg-white text-gray-900 font-semibold text-base shadow-lg hover:bg-white/90 transition-colors max-w-xs w-full"
          style={{ animation: 'fadeUp 0.6s ease 0.2s both' }}
        >
          Voir le catalogue
        </button>
      </div>

      {/* Animation keyframes injectée une seule fois */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
