import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

export interface FaqItem {
  q: string
  a: string
}

const DEFAULT_ITEMS: FaqItem[] = [
  {
    q: "L'essai gratuit nécessite-t-il une carte bancaire ?",
    a: "Non. Aucune information de paiement n'est requise pour démarrer votre essai de 21 jours.",
  },
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Oui. Vous pouvez passer à un plan supérieur ou inférieur à tout moment depuis votre espace client, sans frais de résiliation.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui. Vos données sont isolées dans un espace dédié (architecture multi-tenant), hébergées sur des serveurs sécurisés. Aucun autre client n'a accès à vos données.",
  },
  {
    q: "Comment fonctionne le paiement ?",
    a: "Nous acceptons Orange Money, Wave et les virements bancaires. La facturation est mensuelle ou annuelle selon votre choix.",
  },
  {
    q: "Puis-je utiliser DiDi Sphere sur mobile ?",
    a: "Oui. L'interface est entièrement responsive. La caisse POS est optimisée pour être utilisée sur tablette ou smartphone en boutique.",
  },
  {
    q: "Que se passe-t-il à la fin de l'essai gratuit ?",
    a: "Vous choisissez un plan payant pour continuer. Si vous ne souscrivez pas, votre compte est suspendu mais vos données sont conservées pendant 30 jours.",
  },
]

export default function FaqSection({ items = DEFAULT_ITEMS }: { items?: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i))

  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="text-center mb-10">
        <span className="inline-block rounded-full bg-ds-blue-light dark:bg-ds-blue/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ds-blue mb-4">
          FAQ
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
          Questions fréquentes
        </h2>
      </div>

      <div className="space-y-2">
        {items.map(({ q, a }, i) => {
          const isOpen = openIndex === i
          return (
            <div
              key={i}
              className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
              >
                <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  {q}
                </span>
                <ChevronDownIcon
                  className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Accordéon — grid-rows trick : height 0 → auto sans JS */}
              <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {a}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
