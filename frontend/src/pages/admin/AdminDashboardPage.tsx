import { useQuery } from '@tanstack/react-query'
import { getAdminStats } from '@/services/api/admin'
import { BuildingStorefrontIcon, UsersIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

const SECTOR_LABELS: Record<string, string> = {
  general:  'Commerce général',
  food:     'Alimentation',
  fashion:  'Mode',
  cosmetic: 'Cosmétique',
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string
}) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    refetchInterval: 30_000,
  })

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Tableau de bord</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Tenants total"   value={stats?.tenants_total ?? 0}    icon={BuildingStorefrontIcon} color="bg-indigo-600" />
          <StatCard label="Tenants actifs"  value={stats?.tenants_active ?? 0}   icon={CheckCircleIcon}        color="bg-emerald-600" />
          <StatCard label="Suspendus"       value={stats?.tenants_inactive ?? 0} icon={XCircleIcon}            color="bg-red-600" />
          <StatCard label="Utilisateurs"    value={stats?.users_total ?? 0}      icon={UsersIcon}              color="bg-violet-600" />
        </div>
      )}

      {/* Tenants récents */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Derniers tenants créés</h2>
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
                <div key={t.id} className="px-5 py-3 flex items-center justify-between">
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
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}
