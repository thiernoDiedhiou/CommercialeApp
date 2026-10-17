import apiClient, { API } from '@/lib/axios'

export interface ActivityLogEntry {
  id: number
  user_id: number | null
  user_name: string
  user_role: string
  action: string
  module: string
  description: string
  properties: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface ActivityLogParams {
  user_id?: number
  action?: string
  module?: string
  from?: string
  to?: string
  page?: number
  per_page?: number
}

export async function getActivityLogs(params: ActivityLogParams = {}) {
  const res = await apiClient.get(`${API}/activity-logs`, { params })
  return res.data as {
    data: ActivityLogEntry[]
    current_page: number
    last_page: number
    total: number
    per_page: number
  }
}
