import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

type Variant = 'success' | 'error' | 'warning' | 'info'

const config: Record<
  Variant,
  { icon: React.ComponentType<{ className?: string }>; classes: string }
> = {
  success: { icon: CheckCircleIcon,       classes: 'bg-green-50 border-green-200 text-green-800' },
  error:   { icon: XCircleIcon,           classes: 'bg-red-50 border-red-200 text-red-800' },
  warning: { icon: ExclamationTriangleIcon, classes: 'bg-amber-50 border-amber-200 text-amber-800' },
  info:    { icon: InformationCircleIcon, classes: 'bg-blue-50 border-blue-200 text-blue-800' },
}

interface AlertProps {
  variant?: Variant
  title?: string
  onClose?: () => void
  className?: string
  children: React.ReactNode
}

export default function Alert({
  variant = 'info',
  title,
  onClose,
  className,
  children,
}: AlertProps) {
  const { icon: Icon, classes } = config[variant]

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border p-4',
        classes,
        className,
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />

      <div className="flex-1 min-w-0">
        {title && <p className="mb-1 text-sm font-semibold">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 hover:bg-black/10 transition-colors"
          aria-label="Fermer"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
