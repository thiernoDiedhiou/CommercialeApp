import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getAdminStats, getSubscriptions } from '@/services/api/admin'
import type { DangerTenant } from '@/services/api/admin'
import {
  BuildingStorefrontIcon, UsersIcon, CheckCircleIcon, XCircleIcon,
  ArrowRightIcon, CurrencyDollarIcon, ExclamationTriangleIcon,
  ClockIcon, CreditCardIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline'

const DANGER_DISPLAY_LIMIT = 4

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECTOR_LABELS: Record<string, string> = {
  general:  'Commerce général',
  food:     'Alimentation',
  fashion:  'Mode',
  cosmetic: 'Cosmétique',
}

const CYCLE_LABELS: Record<string, string> = {
  trial:    'Essai',
  monthly:  'Mensuel',
  yearly:   'Annuel',
  lifetime: 'À vie',
}

const STATUS_STYLES: Record<string, string> = {
  trial:     'bg-amber-900/40 text-amber-400',
  active:    'bg-emerald-900/40 text-emerald-400',
  expired:   'bg-gray-800 text-gray-500',
  cancelled: 'bg-red-900/40 text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  trial:     'Essai',
  active:    'Actif',
  expired:   'Expiré',
  cancelled: 'Annulé',
}

function formatMrr(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}k`
  return value.toLocaleString('fr-FR')
}

// ── StatCard compact ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string
  value: string | number
  icon:  React.ComponentType<{ className?: string }>
  color: string
  sub?:  string
}) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Card abonnements avec badges colorés ──────────────────────────────────────

function SubscriptionStatCard({ active, trial, expired }: {
  active: number; trial: number; expired: number
}) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-indigo-600">
        <CreditCardIcon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold text-white">{active}</p>
        <p className="text-sm text-gray-400">Abonnés actifs</p>
        <div className="flex gap-2 mt-1.5">
          {trial > 0 && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-400">
              {trial} essai
            </span>
          )}
          {expired > 0 && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-red-900/40 text-red-400">
              {expired} expirés
            </span>
          )}
          {trial === 0 && expired === 0 && (
            <span className="text-[11px] text-gray-600">Tous à jour</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── DangerItem ────────────────────────────────────────────────────────────────

function DangerItem({ item, label, navigate }: {
  item:     DangerTenant
  label:    string
  navigate: (path: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => navigate(`/admin/tenants/${item.tenant_uid}`)}
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

  const { data: recentSubs, isLoading: isLoadingSubs } = useQuery({
    queryKey: ['admin-subscriptions-recent'],
    queryFn:  () => getSubscriptions({ page: 1 }),
    staleTime: 60_000,
  })

  const totalDanger = (stats?.expiring_soon.length ?? 0) + (stats?.without_subscription.length ?? 0)

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
      <h1 className="text-xl font-bold text-white">Tableau de bord</h1>

      {/* ── KPIs revenus ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Revenus</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {isLoading ? (
            <>
              <div className="h-[72px] rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
              <div className="h-[72px] rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
              <div className="col-span-2 sm:col-span-1 h-[72px] rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
            </>
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
              <div className="col-span-2 sm:col-span-1">
                <SubscriptionStatCard
                  active={stats?.active_count ?? 0}
                  trial={stats?.trial_count ?? 0}
                  expired={stats?.expired_count ?? 0}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── KPIs tenants ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tenants</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[72px] rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
            ))
          ) : (
            <>
              <StatCard label="Total"        value={stats?.tenants_total    ?? 0} icon={BuildingStorefrontIcon} color="bg-violet-600" />
              <StatCard label="Actifs"       value={stats?.tenants_active   ?? 0} icon={CheckCircleIcon}        color="bg-emerald-600" />
              <StatCard label="Suspendus"    value={stats?.tenants_inactive ?? 0} icon={XCircleIcon}            color="bg-red-600" />
              <StatCard label="Utilisateurs" value={stats?.users_total      ?? 0} icon={UsersIcon}              color="bg-blue-600" />
            </>
          )}
        </div>
      </div>

      {/* ── Alertes + Récents ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">

        {/* Tenants en danger */}
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
            <div className="px-5 py-8 text-center">
              <ShieldCheckIcon className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-300">Tout est sous contrôle</p>
              <p className="text-xs text-gray-600 mt-0.5">Aucun tenant en danger</p>
            </div>
          ) : (() => {
            // Alloue jusqu'à DANGER_DISPLAY_LIMIT items en priorisant expiring_soon
            const expiring = stats!.expiring_soon
            const noSub    = stats!.without_subscription
            let remaining  = DANGER_DISPLAY_LIMIT
            const shownExpiring  = expiring.slice(0, remaining)
            remaining -= shownExpiring.length
            const shownNoSub     = noSub.slice(0, remaining)
            const hiddenCount    = (expiring.length - shownExpiring.length) + (noSub.length - shownNoSub.length)

            return (
              <div className="divide-y divide-gray-800">
                {shownExpiring.length > 0 && (
                  <>
                    <div className="px-4 py-2 flex items-center gap-1.5">
                      <ClockIcon className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                        Expiration imminente
                      </span>
                    </div>
                    {shownExpiring.map((item) => (
                      <DangerItem
                        key={item.tenant_id}
                        item={item}
                        label={`${item.plan_name ?? '—'} · ${item.status === 'trial' ? 'Essai' : 'Actif'}`}
                        navigate={navigate}
                      />
                    ))}
                  </>
                )}

                {shownNoSub.length > 0 && (
                  <>
                    <div className="px-4 py-2 flex items-center gap-1.5">
                      <XCircleIcon className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                        Sans abonnement
                      </span>
                    </div>
                    {shownNoSub.map((item) => (
                      <DangerItem
                        key={item.tenant_id}
                        item={item}
                        label="Aucun abonnement actif"
                        navigate={navigate}
                      />
                    ))}
                  </>
                )}

                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate('/admin/tenants')}
                    className="w-full px-4 py-2.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-gray-800/50 transition flex items-center justify-center gap-1"
                  >
                    Voir {hiddenCount} de plus
                    <ArrowRightIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            )
          })()}
        </div>

        {/* Derniers tenants créés */}
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
                    onClick={() => navigate(`/admin/tenants/${t.uid}`)}
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

      {/* ── Abonnements récents ───────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Abonnements récents</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/abonnements')}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            Voir tous
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {isLoadingSubs ? (
          <div className="divide-y divide-gray-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 px-5 flex items-center gap-3">
                <div className="h-3 w-40 rounded bg-gray-800 animate-pulse" />
                <div className="h-3 w-24 rounded bg-gray-800 animate-pulse ml-auto" />
                <div className="h-5 w-16 rounded-full bg-gray-800 animate-pulse" />
              </div>
            ))}
          </div>
        ) : !recentSubs?.data.length ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            Aucun abonnement pour l'instant
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {recentSubs.data.slice(0, 8).map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => navigate(`/admin/tenants/${sub.tenant.uid}`)}
                className="w-full px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-800/60 transition text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{sub.tenant.name}</p>
                  <p className="text-xs text-gray-500">
                    {sub.plan?.name ?? '—'} · {CYCLE_LABELS[sub.billing_cycle] ?? sub.billing_cycle}
                    {sub.ends_at && (
                      <span className="ml-1 text-gray-600">
                        · jusqu'au {new Date(sub.ends_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[sub.status] ?? 'bg-gray-800 text-gray-400'}`}>
                  {STATUS_LABELS[sub.status] ?? sub.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
