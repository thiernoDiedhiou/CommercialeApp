import apiClient from '@/lib/axios'

export interface TenantSettings {
  name:            string
  sector:          string
  currency:        string
  phone:           string | null
  email:           string | null
  address:         string | null
  city:            string | null
  rccm:            string | null
  ninea:           string | null
  primary_color:   string | null
  secondary_color: string | null
  logo_url:        string | null
}

export async function getTenantSettings(): Promise<TenantSettings> {
  const { data } = await apiClient.get<{ data: TenantSettings }>('/api/v1/settings')
  return data.data
}

export async function updateTenantSettings(
  body: Partial<Omit<TenantSettings, 'logo_url' | 'secondary_color'>>,
  logo?: File | null,
  removeLogo?: boolean,
): Promise<TenantSettings> {
  if (logo || removeLogo) {
    const form = new FormData()
    form.append('_method', 'PUT')
    Object.entries(body).forEach(([k, v]) => {
      if (v === undefined || v === null) return
      form.append(k, String(v))
    })
    if (logo) form.append('logo', logo)
    if (removeLogo) form.append('remove_logo', '1')
    const { data } = await apiClient.post<{ data: TenantSettings }>(
      '/api/v1/settings',
      form,
      { headers: { 'Content-Type': undefined } },
    )
    return data.data
  }
  const { data } = await apiClient.put<{ data: TenantSettings }>('/api/v1/settings', body)
  return data.data
}
