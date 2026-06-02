import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getAdminStats } from '@/services/api/admin'
import type { DangerTenant } from '@/services/api/admin'
import {
  BuildingStorefrontIcon, UsersIcon, CheckCircleIcon, XCircleIcon,
  ArrowRightIcon, CurrencyDollarIcon, ExclamationTriangleIcon,
  ClockIcon, CreditCardIcon,
} from '@heroicons/react/24/outline'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECTOR_LABELS: Record<string, string> = {
  general:  'Commerce général',
  food:     'Alimentation',
  fashion:  'Mode',
  cosmetic: 'Cosmétique',
}

function formatMrr(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}k`
  return value.toLocaleString('fr-FR')
}

// ── Composants ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string
  value: string | number
  icon:  React.ComponentType<{ className?: string }>
  color: string
  sub?:  string
}) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function DangerItem({ item, label, navigate }: {
  item:     DangerTenant
  label:    string
  navigate: (path: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => navigate(`/admin/tenants/${item.tenant_id}`)}
      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800/50 transition text-left"
    >
      <div>
        <p className="text-sm font-medium text-white">{item.tenant_name}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      {item.days_remaining !== undefined && item.days_remaining !== null && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          item.days_remaining <= 1 ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/50 text-amber-400'
        }`}>
          {item.days_remaining === 0 ? "Aujourd'hui" :
           item.days_remaining === 1 ? '1j' : `${item.days_remaining}j`}
        </span>
      )}
    </button>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn:  getAdminStats,
    refetchInterval: 30_000,
  })

  const totalDanger = (stats?.expiring_soon.length ?? 0) + (stats?.without_subscription.length ?? 0)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Tableau de bord</h1>

      {/* ── KPIs revenus ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Revenus</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
            ))
          ) : (
            <>
              <StatCard
                label="MRR"
                value={`${formatMrr(stats?.mrr ?? 0)} XOF`}
                icon={CurrencyDollarIcon}
                color="bg-emerald-600"
                sub="Revenu mensuel récurrent"
              />
              <StatCard
                label="ARR"
                value={`${formatMrr(stats?.arr ?? 0)} XOF`}
                icon={CurrencyDollarIcon}
                color="bg-teal-600"
                sub="Revenu annuel estimé"
              />
              <StatCard
                label="Abonnés actifs"
                value={stats?.active_count ?? 0}
                icon={CreditCardIcon}
                color="bg-indigo-600"
                sub={`${stats?.trial_count ?? 0} en essai · ${stats?.expired_count ?? 0} expirés`}
              />
            </>
          )}
        </div>
      </div>

      {/* ── KPIs tenants ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tenants</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
            ))
          ) : (
            <>
              <StatCard label="Total"       value={stats?.tenants_total    ?? 0} icon={BuildingStorefrontIcon} color="bg-violet-600" />
              <StatCard label="Actifs"      value={stats?.tenants_active   ?? 0} icon={CheckCircleIcon}        color="bg-emerald-600" />
              <StatCard label="Suspendus"   value={stats?.tenants_inactive ?? 0} icon={XCircleIcon}            color="bg-red-600" />
              <StatCard label="Utilisateurs"value={stats?.users_total      ?? 0} icon={UsersIcon}              color="bg-blue-600" />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Widget alertes ──────────────────────────────────────────────── */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Tenants en danger</h2>
            {totalDanger > 0 && (
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400">
                {totalDanger}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : totalDanger === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              ✓ Aucun tenant en danger
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {/* Expirant bientôt */}
              {(stats?.expiring_soon ?? []).length > 0 && (
                <>
                  <div className="px-4 py-2 flex items-center gap-1.5">
                    <ClockIcon className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                      Expiration imminente
                    </span>
                  </div>
                  {stats!.expiring_soon.map((item) => (
                    <DangerItem
                      key={item.tenant_id}
                      item={item}
                      label={`${item.plan_name ?? '—'} · ${item.status === 'trial' ? 'Essai' : 'Actif'}`}
                      navigate={navigate}
                    />
                  ))}
                </>
              )}

              {/* Sans abonnement */}
              {(stats?.without_subscription ?? []).length > 0 && (
                <>
                  <div className="px-4 py-2 flex items-center gap-1.5">
                    <XCircleIcon className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                      Sans abonnement
                    </span>
                  </div>
                  {stats!.without_subscription.map((item) => (
                    <DangerItem
                      key={item.tenant_id}
                      item={item}
                      label="Aucun abonnement actif"
                      navigate={navigate}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Tenants récents ─────────────────────────────────────────────── */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Derniers tenants créés</h2>
            <button
              type="button"
              onClick={() => navigate('/admin/tenants')}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              Voir tous
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-800">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 px-5 flex items-center gap-3">
                    <div className="h-3 w-40 rounded bg-gray-800 animate-pulse" />
                    <div className="h-3 w-20 rounded bg-gray-800 animate-pulse ml-auto" />
                  </div>
                ))
              : stats?.tenants_recent.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/admin/tenants/${t.id}`)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-800/60 transition text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-gray-500">{SECTOR_LABELS[t.sector] ?? t.sector}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      t.is_active
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : 'bg-red-900/50 text-red-400'
                    }`}>
                      {t.is_active ? 'Actif' : 'Suspendu'}
                    </span>
                  </button>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
