import { useEffect, useState } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useCartStore } from '@/store/cartStore'
import { syncOffline } from '@/services/api/pos'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const offlineQueue = useCartStore((s) => s.offlineQueue)
  const clearOfflineQueue = useCartStore((s) => s.clearOfflineQueue)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Auto-sync when back online with pending sales
  useEffect(() => {
    if (!isOnline || offlineQueue.length === 0 || syncing) return
    let cancelled = false
    ;(async () => {
      setSyncing(true)
      try {
        await syncOffline(offlineQueue)
        if (!cancelled) clearOfflineQueue()
      } catch {
        // garde la queue pour la prochaine tentative
      } finally {
        if (!cancelled) setSyncing(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  if (isOnline && offlineQueue.length === 0) return null

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 text-sm text-white shrink-0 ${
        !isOnline ? 'bg-orange-500' : 'bg-blue-500'
      }`}
    >
      {syncing ? (
        <ArrowPathIcon className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
      )}
      <span>
        {!isOnline
          ? 'Hors-ligne — les ventes seront synchronisées à la reconnexion'
          : `Synchronisation de ${offlineQueue.length} vente(s) hors-ligne…`}
      </span>
      {!isOnline && offlineQueue.length > 0 && (
        <span className="ml-auto font-semibold">{offlineQueue.length} en attente</span>
      )}
    </div>
  )
}
