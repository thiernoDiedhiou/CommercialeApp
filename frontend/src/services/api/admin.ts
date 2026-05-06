import adminAxios from '@/lib/adminAxios'

// ── Auth ──────────────────────────────────────────────────────────────────

export interface SuperAdminInfo {
  id: number
  name: string
  email: string
}

export interface AdminLoginResponse {
  token: string
  data: SuperAdminInfo
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const { data } = await adminAxios.post<AdminLoginResponse>('/api/v1/admin/auth/login', { email, password })
  return data
}

export async function adminLogout(): Promise<void> {
  await adminAxios.post('/api/v1/admin/auth/logout')
}

// ── Stats ─────────────────────────────────────────────────────────────────

export interface AdminStats {
  tenants_total:    number
  tenants_active:   number
  tenants_inactive: number
  users_total:      number
  tenants_recent:   { id: number; name: string; sector: string; is_active: boolean; created_at: string }[]
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await adminAxios.get<{ data: AdminStats }>('/api/v1/admin/stats')
  return data.data
}

// ── Tenants ───────────────────────────────────────────────────────────────

export interface AdminTenant {
  id:              number
  name:            string
  slug:            string
  sector:          string
  currency:        string
  phone:           string | null
  email:           string | null
  address:         string | null
  city:            string | null
  primary_color:   string | null
  secondary_color: string | null
  logo_url:        string | null
  is_active:       boolean
  users_count:     number
  created_at:      string
}

export interface CreateTenantData {
  name:             string
  sector:           string
  currency:         string
  phone?:           string | null
  email?:           string | null
  address?:         string | null
  city?:            string | null
  primary_color?:   string | null
  secondary_color?: string | null
  admin_name:       string
  admin_email:      string
  admin_password:   string
}

export interface UpdateTenantData {
  name?:            string
  sector?:          string
  currency?:        string
  phone?:           string | null
  email?:           string | null
  address?:         string | null
  city?:            string | null
  primary_color?:   string | null
  secondary_color?: string | null
}

export interface PaginatedTenants {
  data:         AdminTenant[]
  current_page: number
  last_page:    number
  total:        number
  per_page:     number
}

export interface TenantUser {
  id:         number
  name:       string
  email:      string
  is_active:  boolean
  created_at: string
}

export async function getAdminTenants(params: { search?: string; is_active?: boolean; page?: number } = {}): Promise<PaginatedTenants> {
  const { data } = await adminAxios.get<PaginatedTenants>('/api/v1/admin/tenants', { params })
  return data
}

export async function getAdminTenant(id: number): Promise<{ data: AdminTenant; users: TenantUser[] }> {
  const { data } = await adminAxios.get<{ data: AdminTenant; users: TenantUser[] }>(`/api/v1/admin/tenants/${id}`)
  return data
}

export async function createAdminTenant(body: CreateTenantData): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>('/api/v1/admin/tenants', body)
  return data.data
}

export async function updateAdminTenant(id: number, body: UpdateTenantData): Promise<AdminTenant> {
  const { data } = await adminAxios.put<{ data: AdminTenant }>(`/api/v1/admin/tenants/${id}`, body)
  return data.data
}

export async function suspendTenant(id: number): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>(`/api/v1/admin/tenants/${id}/suspend`)
  return data.data
}

export async function activateTenant(id: number): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>(`/api/v1/admin/tenants/${id}/activate`)
  return data.data
}

export async function deleteAdminTenant(id: number): Promise<void> {
  await adminAxios.delete(`/api/v1/admin/tenants/${id}`)
}
