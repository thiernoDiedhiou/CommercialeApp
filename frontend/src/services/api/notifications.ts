import apiClient from '@/lib/axios'
import adminAxios from '@/lib/adminAxios'

export interface AppNotification {
  id          : string
  type        : string
  data        : Record<string, unknown>
  read_at     : string | null
  created_at  : string
}

export interface NotificationsResponse {
  data         : AppNotification[]
  unread_count : number
}

// ── Tenant ────────────────────────────────────────────────────────────────────

export async function getTenantNotifications(): Promise<NotificationsResponse> {
  const { data } = await apiClient.get<NotificationsResponse>('/api/v1/notifications')
  return data
}

export async function markTenantNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/api/v1/notifications/${id}/read`)
}

export async function markAllTenantNotificationsRead(): Promise<void> {
  await apiClient.post('/api/v1/notifications/read-all')
}

export async function deleteTenantNotification(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/notifications/${id}`)
}

// ── Super Admin ───────────────────────────────────────────────────────────────

export async function getAdminNotifications(): Promise<NotificationsResponse> {
  const { data } = await adminAxios.get<NotificationsResponse>('/api/v1/admin/notifications')
  return data
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  await adminAxios.post(`/api/v1/admin/notifications/${id}/read`)
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  await adminAxios.post('/api/v1/admin/notifications/read-all')
}

export async function deleteAdminNotification(id: string): Promise<void> {
  await adminAxios.delete(`/api/v1/admin/notifications/${id}`)
}
