import { useRef, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BellIcon, CheckIcon, TrashIcon, BuildingStorefrontIcon, ArchiveBoxXMarkIcon } from '@heroicons/react/24/outline'
import { BellAlertIcon } from '@heroicons/react/24/solid'
import type { AppNotification, NotificationsResponse } from '@/services/api/notifications'
import { formatDateTime } from '@/lib/utils'

interface Props {
  queryKey   : string
  fetchFn    : () => Promise<NotificationsResponse>
  markReadFn : (id: string) => Promise<void>
  markAllFn  : () => Promise<void>
  deleteFn   : (id: string) => Promise<void>
  dark?      : boolean   // true → style fond sombre (AdminLayout)
}

function notificationLabel(n: AppNotification): { title: string; body: string } {
  const d = n.data
  switch (d.type) {
    case 'new_tenant':
      return {
        title: `Nouveau tenant — ${d.tenant_name as string}`,
        body : `${d.admin_name as string} · ${d.sector as string}${d.source === 'landing' ? ' · Landing page' : ''}`,
      }
    case 'stock_alert':
      return {
        title: `Stock bas — ${d.product_name as string}`,
        body : `${d.stock_quantity as number} en stock (seuil : ${d.alert_threshold as number})`,
      }
    default:
      return { title: 'Notification', body: '' }
  }
}

function NotificationIcon({ type }: { type: string }) {
  if (type === 'new_tenant') {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100">
        <BuildingStorefrontIcon className="h-4 w-4 text-indigo-600" />
      </span>
    )
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100">
      <ArchiveBoxXMarkIcon className="h-4 w-4 text-orange-600" />
    </span>
  )
}

export default function NotificationBell({ queryKey, fetchFn, markReadFn, markAllFn, deleteFn, dark = false }: Props) {
  const [open, setOpen]       = useState(false)
  const dropdownRef           = useRef<HTMLDivElement>(null)
  const queryClient           = useQueryClient()

  const { data } = useQuery<NotificationsResponse>({
    queryKey      : [queryKey],
    queryFn       : fetchFn,
    refetchInterval: 60_000,
    staleTime     : 30_000,
  })

  const unread      = data?.unread_count ?? 0
  const notifs      = data?.data ?? []

  // Ferme le dropdown au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] })

  const markRead = useMutation({
    mutationFn: markReadFn,
    onSuccess : invalidate,
  })

  const markAll = useMutation({
    mutationFn: markAllFn,
    onSuccess : invalidate,
  })

  const remove = useMutation({
    mutationFn: deleteFn,
    onSuccess : invalidate,
  })

  const btnBase = dark
    ? 'relative p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors'
    : 'relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors'

  const dropdownBase = dark
    ? 'absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl z-50'
    : 'absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-2xl z-50'

  const headerText  = dark ? 'text-white'      : 'text-gray-900'
  const subText     = dark ? 'text-gray-400'   : 'text-gray-500'
  const itemHover   = dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
  const divider     = dark ? 'border-gray-800'   : 'border-gray-100'
  const emptyText   = dark ? 'text-gray-500'   : 'text-gray-400'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ''}`}
        className={btnBase}
      >
        {unread > 0 ? (
          <BellAlertIcon className="h-5 w-5 text-indigo-400" />
        ) : (
          <BellIcon className="h-5 w-5" />
        )}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={dropdownBase}>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${divider}`}>
            <span className={`text-sm font-semibold ${headerText}`}>
              Notifications {unread > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className={`flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50`}
              >
                <CheckIcon className="h-3.5 w-3.5" />
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className={`py-8 text-center text-sm ${emptyText}`}>
                Aucune notification
              </div>
            ) : (
              notifs.map((n) => {
                const { title, body } = notificationLabel(n)
                const isUnread = !n.read_at
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b ${divider} ${itemHover} transition-colors ${isUnread ? 'opacity-100' : 'opacity-60'}`}
                  >
                    <NotificationIcon type={n.data.type as string} />

                    <button
                      type="button"
                      className="flex-1 min-w-0 text-left"
                      onClick={() => { if (isUnread) markRead.mutate(n.id) }}
                    >
                      <p className={`text-sm font-medium truncate ${headerText} ${isUnread ? 'font-semibold' : ''}`}>
                        {title}
                      </p>
                      {body && <p className={`text-xs truncate mt-0.5 ${subText}`}>{body}</p>}
                      <p className={`text-[11px] mt-1 ${subText}`}>{formatDateTime(n.created_at)}</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => remove.mutate(n.id)}
                      aria-label="Supprimer"
                      className={`shrink-0 p-1 rounded hover:text-red-400 ${subText} transition-colors`}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
