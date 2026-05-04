import apiClient from '@/lib/axios'
import type { DashboardSummary } from '@/types'

/**
 * GET /api/v1/dashboard/summary
 * Le backend retourne l'objet directement (pas de wrapper { data: ... }).
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/api/v1/dashboard/summary')
  return data
}
