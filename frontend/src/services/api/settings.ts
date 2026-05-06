import apiClient from '@/lib/axios'

export interface TenantSettings {
  name:            string
  sector:          string
  currency:        string
  phone:           string | null
  email:           string | null
  address:         string | null
  city:            string | null
  primary_color:   string | null
  secondary_color: string | null
}

export async function getTenantSettings(): Promise<TenantSettings> {
  const { data } = await apiClient.get<{ data: TenantSettings }>('/api/v1/settings')
  return data.data
}

export async function updateTenantSettings(body: Partial<TenantSettings>): Promise<TenantSettings> {
  const { data } = await apiClient.put<{ data: TenantSettings }>('/api/v1/settings', body)
  return data.data
}
