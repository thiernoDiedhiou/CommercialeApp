import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Props {
  text: string
}

function hashText(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

export default function AnnouncementBar({ text }: Props) {
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

  return (
    <div
      className="relative w-full py-2 px-10 text-center text-sm text-white font-medium"
      style={{ backgroundColor: 'var(--shop-primary, #111827)' }}
    >
      <span className="block overflow-hidden truncate">{text}</span>
      <button
        type="button"
        onClick={close}
        aria-label="Fermer l'annonce"
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  )
}
