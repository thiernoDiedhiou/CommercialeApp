import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getSubscriptions, getAdminPlans } from '@/services/api/admin'
import { CurrencyDollarIcon, CreditCardIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline'

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  trial:     'Essai',
  active:    'Actif',
  expired:   'Expiré',
  cancelled: 'Annulé',
}
const STATUS_COLOR: Record<string, string> = {
  trial:     'bg-blue-900/50 text-blue-300',
  active:    'bg-emerald-900/50 text-emerald-400',
  expired:   'bg-red-900/50 text-red-400',
  cancelled: 'bg-gray-800 text-gray-500',
}
const CYCLE_LABEL: Record<string, string> = {
  trial:    'Essai',
  monthly:  'Mensuel',
  yearly:   'Annuel',
  lifetime: 'À vie',
}

function formatMrr(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`
  return v.toLocaleString('fr-FR')
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AdminSubscriptionsPage() {
  const navigate  = useNavigate()
  const [status,  setStatus]  = useState('')
  const [planId,  setPlanId]  = useState<number | ''>('')
  const [page,    setPage]    = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', status, planId, page],
    queryFn:  () => getSubscriptions({
      status:  status  || undefined,
      plan_id: planId  || undefined,
      page,
    }),
    placeholderData: (prev) => prev,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['admin-plans'],
    queryFn:  getAdminPlans,
  })

  const summary = data?.summary
  const subs    = data?.data ?? []
  const meta    = data?.meta

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Abonnements</h1>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'MRR',         value: summary ? `${formatMrr(summary.mrr)} XOF` : '—',        icon: CurrencyDollarIcon, color: 'bg-emerald-600' },
          { label: 'Actifs',      value: summary?.active_count  ?? '—',                           icon: CreditCardIcon,     color: 'bg-indigo-600'  },
          { label: 'En essai',    value: summary?.trial_count   ?? '—',                           icon: ClockIcon,          color: 'bg-blue-600'    },
          { label: 'Expirés',     value: summary?.expired_count ?? '—',                           icon: XCircleIcon,        color: 'bg-red-600'     },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-gray-900 border border-gray-800 p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          aria-label="Filtrer par statut"
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
        >
          <option value="">Tous les statuts</option>
          <option value="trial">Essai</option>
          <option value="active">Actif</option>
          <option value="expired">Expiré</option>
          <option value="cancelled">Annulé</option>
        </select>

        <select
          value={planId}
          onChange={(e) => { setPlanId(e.target.value ? Number(e.target.value) : ''); setPage(1) }}
          aria-label="Filtrer par plan"
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
        >
          <option value="">Tous les plans</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {(status || planId) && (
          <button
            type="button"
            onClick={() => { setStatus(''); setPlanId(''); setPage(1) }}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:border-gray-500 hover:text-white transition"
          >
            Effacer les filtres
          </button>
        )}

        {meta && (
          <span className="ml-auto text-sm text-gray-500 self-center">
            {meta.total} abonnement{meta.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-x-auto">
        <table className="min-w-max w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-5 py-3 text-left">Tenant</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Cycle</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Début</th>
              <th className="px-4 py-3 text-left">Fin</th>
              <th className="px-4 py-3 text-left">Restant</th>
              <th className="sr-only px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><div className="h-3 w-32 rounded bg-gray-800 animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-3 w-20 rounded bg-gray-800 animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-3 w-16 rounded bg-gray-800 animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-gray-800 animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-3 w-20 rounded bg-gray-800 animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-3 w-20 rounded bg-gray-800 animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-3 w-10 rounded bg-gray-800 animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-3 w-8 rounded bg-gray-800 animate-pulse" /></td>
                </tr>
              ))
            ) : subs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-500">
                  Aucun abonnement trouvé.
                </td>
              </tr>
            ) : (
              subs.map((sub) => (
                <tr
                  key={sub.id}
                  className="hover:bg-gray-800/50 transition cursor-pointer"
                  onClick={() => navigate(`/admin/tenants/${sub.tenant.id}`)}
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{sub.tenant.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{sub.tenant.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{sub.plan?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{CYCLE_LABEL[sub.billing_cycle] ?? sub.billing_cycle}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[sub.status] ?? ''}`}>
                      {STATUS_LABEL[sub.status] ?? sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(sub.starts_at)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(sub.ends_at)}</td>
                  <td className="px-4 py-3 text-xs">
                    {['active', 'trial'].includes(sub.status) && sub.days_remaining !== null && sub.days_remaining !== undefined ? (
                      <span className={sub.days_remaining <= 7 ? 'text-red-400 font-medium' : 'text-gray-400'}>
                        {sub.days_remaining === 0 ? "Aujourd'hui" : `${sub.days_remaining}j`}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/tenants/${sub.tenant.id}`) }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Voir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Page {meta.current_page} / {meta.last_page}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:border-gray-500 disabled:opacity-40 transition"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:border-gray-500 disabled:opacity-40 transition"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
