import { useEffect, useState } from 'react'

interface Props {
  text    : string
  phone  ?: string | null
  marquee?: boolean
}

function hashText(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

export default function AnnouncementBar({ text, phone, marquee }: Props) {
  const key = `shop-announcement-closed-${hashText(text)}`

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(key)) {
      setVisible(true)
    }
  }, [key])

  const close = () => {
    localStorage.setItem(key, '1')
    setVisible(false)
  }

  if (!visible) return null

  const waHref = phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}`
    : null

  return (
    <>
      <div
        className="shop-announcement-bg relative w-full py-2 text-white text-sm font-medium overflow-hidden"
      >
        <div className="flex items-center px-10">

          {/* ── Left : numéro de téléphone (desktop) ────────────────────── */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs opacity-80 shrink-0 w-44">
            {phone && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span>{phone}</span>
              </>
            )}
          </div>

          {/* ── Centre : texte (marquee ou statique) ────────────────────── */}
          <div className="flex-1 overflow-hidden text-center">
            {marquee ? (
              <div className="overflow-hidden">
                <span className="shop-marquee-track">
                  <span className="px-16">{text}</span>
                  <span className="px-16">{text}</span>
                </span>
              </div>
            ) : (
              <span className="block truncate">{text}</span>
            )}
          </div>

          {/* ── Right : lien WhatsApp (desktop) ─────────────────────────── */}
          <div className="hidden sm:flex justify-end shrink-0 w-44">
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contacter sur WhatsApp"
                className="flex items-center gap-1.5 text-xs opacity-80 hover:opacity-100 transition-opacity"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </span>
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        {/* ── Bouton fermeture ─────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={close}
          aria-label="Fermer l'annonce"
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </>
  )
}
