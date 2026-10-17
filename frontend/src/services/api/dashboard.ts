import apiClient, { API } from '@/lib/axios'
import type { DashboardSummary } from '@/types'

/**
 * GET /api/v1/dashboard/summary
 * Le backend retourne l'objet directement (pas de wrapper { data: ... }).
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>(`${API}/dashboard/summary`)
  return data
}
