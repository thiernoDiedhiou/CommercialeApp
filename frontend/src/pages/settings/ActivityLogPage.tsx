import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BoltIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  TagIcon,
  DocumentTextIcon,
  TruckIcon,
  UserGroupIcon,
  CubeIcon,
  ArrowUturnLeftIcon,
  CogIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { getActivityLogs } from '@/services/api/activityLogs'
import type { ActivityLogEntry } from '@/services/api/activityLogs'
import Pagination from '@/components/ui/Pagination'
import CanDo from '@/components/ui/CanDo'
import EmptyState from '@/components/ui/EmptyState'
import { formatDateTime } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionBadge(action: string) {
  const map: Record<string, { label: string; className: string }> = {
    login:   { label: 'Connexion',    className: 'bg-blue-100 text-blue-700' },
    logout:  { label: 'Déconnexion',  className: 'bg-blue-100 text-blue-700' },
    create:  { label: 'Créer',        className: 'bg-emerald-100 text-emerald-700' },
    update:  { label: 'Modifier',     className: 'bg-amber-100 text-amber-700' },
    delete:  { label: 'Supprimer',    className: 'bg-red-100 text-red-700' },
    cancel:  { label: 'Annuler',      className: 'bg-red-100 text-red-700' },
    send:    { label: 'Envoyer',      className: 'bg-purple-100 text-purple-700' },
    payment: { label: 'Paiement',     className: 'bg-green-100 text-green-700' },
    confirm: { label: 'Confirmer',    className: 'bg-emerald-100 text-emerald-700' },
    receive: { label: 'Réceptionner', className: 'bg-emerald-100 text-emerald-700' },
    import:        { label: 'Import',            className: 'bg-indigo-100 text-indigo-700' },
    pdf:           { label: 'PDF',               className: 'bg-gray-100 text-gray-700' },
    open_session:  { label: 'Ouverture session', className: 'bg-teal-100 text-teal-700' },
    close_session: { label: 'Fermeture session', className: 'bg-teal-100 text-teal-700' },
    sync:          { label: 'Sync hors-ligne',   className: 'bg-indigo-100 text-indigo-700' },
  }
  const config = map[action] ?? { label: action, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

const MODULE_CONFIG: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  auth:      { label: 'Auth',        Icon: ShieldCheckIcon },
  sales:     { label: 'Ventes',      Icon: ShoppingCartIcon },
  pos:       { label: 'POS',         Icon: ShoppingCartIcon },
  products:  { label: 'Produits',    Icon: TagIcon },
  invoices:  { label: 'Factures',    Icon: DocumentTextIcon },
  purchases: { label: 'Achats',      Icon: TruckIcon },
  customers: { label: 'Clients',     Icon: UserGroupIcon },
  suppliers: { label: 'Fournisseurs',Icon: TruckIcon },
  stock:     { label: 'Stock',       Icon: CubeIcon },
  returns:   { label: 'Retours',     Icon: ArrowUturnLeftIcon },
  settings:  { label: 'Paramètres',  Icon: CogIcon },
}

function ModuleBadge({ module }: { module: string }) {
  const config = MODULE_CONFIG[module] ?? { label: module, Icon: CogIcon }
  const { Icon, label } = config
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium uppercase text-gray-500">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

const ACTIONS = [
  { value: '',        label: 'Toutes les actions' },
  { value: 'login',   label: 'Connexion' },
  { value: 'logout',  label: 'Déconnexion' },
  { value: 'create',  label: 'Créer' },
  { value: 'update',  label: 'Modifier' },
  { value: 'delete',  label: 'Supprimer' },
  { value: 'cancel',  label: 'Annuler' },
  { value: 'send',    label: 'Envoyer' },
  { value: 'payment', label: 'Paiement' },
  { value: 'import',       label: 'Import' },
  { value: 'pdf',          label: 'PDF' },
  { value: 'open_session', label: 'Ouverture session' },
  { value: 'close_session',label: 'Fermeture session' },
  { value: 'sync',         label: 'Sync hors-ligne' },
]

const MODULES = [
  { value: '',          label: 'Tous les modules' },
  { value: 'auth',      label: 'Auth' },
  { value: 'sales',     label: 'Ventes' },
  { value: 'pos',       label: 'POS' },
  { value: 'products',  label: 'Produits' },
  { value: 'invoices',  label: 'Factures' },
  { value: 'purchases', label: 'Achats' },
  { value: 'customers', label: 'Clients' },
  { value: 'suppliers', label: 'Fournisseurs' },
  { value: 'stock',     label: 'Stock' },
  { value: 'returns',   label: 'Retours' },
  { value: 'settings',  label: 'Paramètres' },
]

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-2 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-20 bg-gray-200 rounded-full" />
        <div className="h-4 w-24 bg-gray-100 rounded" />
      </div>
      <div className="h-4 w-32 bg-gray-200 rounded" />
      <div className="h-4 w-full bg-gray-100 rounded" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ActivityLogPage() {
  const [action, setAction]   = useState('')
  const [module, setModule]   = useState('')
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [page, setPage]       = useState(1)

  const filters = { action, module, from, to, page, per_page: 25 }

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: () => getActivityLogs(filters),
  })

  const entries: ActivityLogEntry[] = data?.data ?? []

  return (
    <CanDo permission="settings.view">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BoltIcon className="h-6 w-6 text-brand-primary" aria-hidden="true" />
              <h1 className="text-xl font-bold text-gray-900">Journal d'activité</h1>
              {data && (
                <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
                  {data.total}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              Traçabilité complète de toutes les actions
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>

          <select
            value={module}
            onChange={(e) => { setModule(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            {MODULES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label htmlFor="al-from" className="text-sm text-gray-600 whitespace-nowrap">Du</label>
            <input
              id="al-from"
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1) }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="al-to" className="text-sm text-gray-600 whitespace-nowrap">Au</label>
            <input
              id="al-to"
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1) }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
        </div>

        {/* Tableau desktop */}
        <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Date &amp; Heure
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Agent
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Action
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Module
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Description
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : entries.length === 0
                  ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState icon={<MagnifyingGlassIcon className="h-7 w-7" />} title="Aucune entrée trouvée" description="Essayez de modifier les filtres ou la période sélectionnée." />
                      </td>
                    </tr>
                  )
                  : entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{entry.user_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        {actionBadge(entry.action)}
                      </td>
                      <td className="px-4 py-3">
                        <ModuleBadge module={entry.module} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400">
                        {entry.ip_address ?? '—'}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Cartes mobiles */}
        <div className="md:hidden space-y-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : entries.length === 0
              ? (
                <EmptyState icon={<MagnifyingGlassIcon className="h-7 w-7" />} title="Aucune entrée trouvée" description="Essayez de modifier les filtres ou la période sélectionnée." />
              )
              : entries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {actionBadge(entry.action)}
                      <ModuleBadge module={entry.module} />
                    </div>
                    <span className="text-xs text-gray-400">{formatDateTime(entry.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{entry.user_name}</span>
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500">
                      {entry.user_role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{entry.description}</p>
                  {entry.ip_address && (
                    <p className="text-xs text-gray-400">{entry.ip_address}</p>
                  )}
                </div>
              ))
          }
        </div>

        {/* Pagination */}
        {data && data.last_page > 1 && (
          <Pagination
            currentPage={data.current_page}
            lastPage={data.last_page}
            total={data.total}
            perPage={data.per_page}
            onPageChange={setPage}
          />
        )}
      </div>
    </CanDo>
  )
}
