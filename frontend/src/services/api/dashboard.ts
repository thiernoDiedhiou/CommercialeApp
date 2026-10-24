import apiClient, { API } from '@/lib/axios'
import type { DashboardSummary } from '@/types'

export interface DashboardParams {
  date_from?:  string // Y-m-d
  date_to?:    string // Y-m-d
  chart_days?: number // 7 | 30 | 90
}

/**
 * GET /api/v1/dashboard/summary?date_from=&date_to=
 * Sans params → statistiques du jour (comportement par défaut du backend).
 */
export async function getDashboardSummary(params?: DashboardParams): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>(`${API}/dashboard/summary`, { params })
  return data
}
