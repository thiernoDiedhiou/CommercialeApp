import { useToastStore } from '@/store/toastStore'
import type { Toast, ToastType } from '@/store/toastStore'
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

const CONFIG: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
  success: { bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300', icon: <CheckCircleIcon className="h-5 w-5 text-emerald-500" /> },
  error:   { bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',                         icon: <XCircleIcon className="h-5 w-5 text-red-500" /> },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',             icon: <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" /> },
  info:    { bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',                   icon: <InformationCircleIcon className="h-5 w-5 text-blue-500" /> },
}

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.removeToast)
  const { bg, icon } = CONFIG[toast.type]

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md ${bg} max-w-sm w-full`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
      <button
        type="button"
        onClick={() => remove(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fermer"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
