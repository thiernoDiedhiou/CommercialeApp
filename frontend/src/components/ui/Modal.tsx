import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: ModalSize
  /** Boutons d'action en bas (Confirmer, Annuler, etc.) */
  footer?: React.ReactNode
  children: React.ReactNode
}

export default function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  footer,
  children,
}: ModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/60" aria-hidden="true" />

      {/* Centrage */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            className={cn(
              'w-full rounded-xl bg-white shadow-xl',
              sizeClasses[size],
            )}
          >
            {/* En-tête */}
            {title && (
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <DialogTitle className="text-base font-semibold text-gray-900">
                  {title}
                </DialogTitle>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Fermer"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Contenu */}
            <div className="px-6 py-5">{children}</div>

            {/* Pied de page */}
            {footer && (
              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                {footer}
              </div>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
