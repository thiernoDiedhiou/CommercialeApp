interface Props {
  title       : string
  description ?: string
  action      ?: { label: string; onClick: () => void }
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {/* Illustration boîte vide */}
      <svg
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-32 h-32 mb-6"
        aria-hidden="true"
      >
        {/* Couvercle */}
        <path
          d="M16 44 L64 20 L112 44 L64 68 Z"
          fill="#E5E7EB"
          stroke="#D1D5DB"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Corps boîte */}
        <path
          d="M16 44 L16 92 L64 116 L112 92 L112 44 L64 68 Z"
          fill="#F3F4F6"
          stroke="#D1D5DB"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Pli avant */}
        <path
          d="M64 68 L64 116"
          stroke="#D1D5DB"
          strokeWidth="2"
        />
        {/* Pli gauche */}
        <path
          d="M16 44 L64 68"
          stroke="#D1D5DB"
          strokeWidth="2"
        />
        {/* Pli droit */}
        <path
          d="M112 44 L64 68"
          stroke="#D1D5DB"
          strokeWidth="2"
        />
        {/* Ruban vertical couvercle */}
        <path
          d="M64 20 L64 68"
          stroke="#D1D5DB"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        {/* Points décoratifs */}
        <circle cx="64" cy="20" r="3" fill="#9CA3AF" />
        <circle cx="16" cy="44" r="3" fill="#9CA3AF" />
        <circle cx="112" cy="44" r="3" fill="#9CA3AF" />
      </svg>

      <h3 className="text-lg font-medium text-gray-700">{title}</h3>

      {description && (
        <p className="mt-1 text-sm text-gray-400 max-w-xs">{description}</p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-6 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--shop-primary, #111827)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
