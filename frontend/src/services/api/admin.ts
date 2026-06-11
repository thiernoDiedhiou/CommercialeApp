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

export interface DangerTenant {
  tenant_id:      number
  tenant_name:    string
  tenant_slug:    string
  plan_name?:     string | null
  status?:        string
  ends_at?:       string | null
  days_remaining?: number | null
}

export interface AdminStats {
  // Tenants
  tenants_total:    number
  tenants_active:   number
  tenants_inactive: number
  users_total:      number
  // Abonnements
  trial_count:   number
  active_count:  number
  expired_count: number
  mrr:           number
  arr:           number
  // Alertes
  expiring_soon:        DangerTenant[]
  without_subscription: DangerTenant[]
  // Liste récente
  tenants_recent: { id: number; name: string; sector: string; is_active: boolean; created_at: string }[]
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await adminAxios.get<{ data: AdminStats }>('/api/v1/admin/stats')
  return data.data
}

// ── Tenants ───────────────────────────────────────────────────────────────

export interface AdminTenantSubscription {
  status:         string
  plan_name:      string | null
  plan_slug:      string | null
  billing_cycle:  string
  ends_at:        string | null
  days_remaining: number | null
}

export interface AdminTenant {
  id:                     number
  name:                   string
  slug:                   string
  custom_domain:          string | null
  api_key:                string
  sector:                 string
  currency:               string
  phone:                  string | null
  email:                  string | null
  address:                string | null
  city:                   string | null
  primary_color:          string | null
  secondary_color:        string | null
  logo_url:               string | null
  is_active:              boolean
  users_count:            number
  created_at:             string
  deleted_at:             string | null
  scheduled_deletion_at:  string | null
  days_until_deletion:    number | null
  subscription:           AdminTenantSubscription | null
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
  slug?:            string
  sector?:          string
  currency?:        string
  custom_domain?:   string | null
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

export async function getAdminTenants(params: { search?: string; is_active?: boolean; plan_id?: number; page?: number; trashed?: boolean } = {}): Promise<PaginatedTenants> {
  const { data } = await adminAxios.get<PaginatedTenants>('/api/v1/admin/tenants', { params })
  return data
}

export async function restoreTenant(id: number): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>(`/api/v1/admin/tenants/${id}/restore`)
  return data.data
}

export async function scheduleTenantDeletion(id: number): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>(`/api/v1/admin/tenants/${id}/schedule-deletion`)
  return data.data
}

export async function cancelTenantDeletion(id: number): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>(`/api/v1/admin/tenants/${id}/cancel-deletion`)
  return data.data
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

// ── Plans ─────────────────────────────────────────────────────────────────

export interface Plan {
  id:                    number
  name:                  string
  slug:                  string
  tagline:               string | null
  badge:                 string | null
  description:           string | null
  features:              string[] | null
  sort_order:            number
  is_active:             boolean
  is_public:             boolean
  price_monthly:         string
  price_yearly:          string | null
  yearly_discount_pct:   number | null
  trial_days:            number
  max_users:             number
  max_products:          number
  max_monthly_sales:     number
  feature_pos:           boolean
  feature_invoicing:     boolean
  feature_purchases:     boolean
  feature_reports:       boolean
  feature_shop:          boolean
  feature_import_csv:    boolean
  feature_stock_alerts:  boolean
  feature_multi_user:    boolean
  feature_custom_domain: boolean
  subscriptions_count?:         number
  active_subscribers_count?:    number
  trial_subscribers_count?:     number
}

export interface PlanFormData {
  name:                  string
  slug:                  string
  tagline?:              string
  badge?:                string
  description?:          string
  features?:             string[]
  sort_order?:           number
  is_active:             boolean
  is_public:             boolean
  price_monthly:         number
  price_yearly?:         number | null
  yearly_discount_pct?:  number | null
  trial_days?:           number
  max_users?:            number
  max_products?:         number
  max_monthly_sales?:    number
  feature_pos:           boolean
  feature_invoicing:     boolean
  feature_purchases:     boolean
  feature_reports:       boolean
  feature_shop:          boolean
  feature_import_csv:    boolean
  feature_stock_alerts:  boolean
  feature_multi_user:    boolean
  feature_custom_domain: boolean
}

export async function getAdminPlans(): Promise<Plan[]> {
  const { data } = await adminAxios.get<{ data: Plan[] }>('/api/v1/admin/plans')
  return data.data
}

export async function getAdminPlan(id: number): Promise<Plan> {
  const { data } = await adminAxios.get<{ data: Plan }>(`/api/v1/admin/plans/${id}`)
  return data.data
}

export async function createAdminPlan(body: PlanFormData): Promise<Plan> {
  const { data } = await adminAxios.post<{ data: Plan }>('/api/v1/admin/plans', body)
  return data.data
}

export async function updateAdminPlan(id: number, body: Partial<PlanFormData>): Promise<Plan> {
  const { data } = await adminAxios.put<{ data: Plan }>(`/api/v1/admin/plans/${id}`, body)
  return data.data
}

export async function deleteAdminPlan(id: number): Promise<void> {
  await adminAxios.delete(`/api/v1/admin/plans/${id}`)
}

// ── Abonnements ───────────────────────────────────────────────────────────

export interface Subscription {
  id:             number
  plan:           { id: number; name: string; slug: string } | null
  billing_cycle:  'trial' | 'monthly' | 'yearly' | 'lifetime'
  status:         'trial' | 'active' | 'expired' | 'cancelled'
  starts_at:      string
  ends_at:        string | null
  days_remaining: number | null
  notes:          string | null
  created_at:     string
}

export interface SubscriptionSummary {
  mrr:           number
  trial_count:   number
  active_count:  number
  expired_count: number
}

export async function getTenantSubscription(tenantId: number): Promise<Subscription | null> {
  const { data } = await adminAxios.get<{ data: Subscription | null }>(`/api/v1/admin/tenants/${tenantId}/subscription`)
  return data.data
}

export async function assignSubscription(tenantId: number, body: {
  plan_id: number
  billing_cycle: string
  starts_at?: string
  ends_at?: string
  notes?: string
}): Promise<Subscription> {
  const { data } = await adminAxios.post<{ data: Subscription }>(`/api/v1/admin/tenants/${tenantId}/subscription`, body)
  return data.data
}

export async function updateSubscription(tenantId: number, body: {
  ends_at?: string | null
  status?: string
  notes?: string
}): Promise<Subscription> {
  const { data } = await adminAxios.put<{ data: Subscription }>(`/api/v1/admin/tenants/${tenantId}/subscription`, body)
  return data.data
}

export async function getSubscriptions(params?: { status?: string; plan_id?: number; page?: number }): Promise<{
  data: (Subscription & { tenant: { id: number; name: string; slug: string; is_active: boolean } })[]
  meta: { current_page: number; last_page: number; total: number; per_page: number }
  summary: SubscriptionSummary
}> {
  const { data } = await adminAxios.get('/api/v1/admin/subscriptions', { params })
  return data
}

export async function getTenantSubscriptionHistory(tenantId: number): Promise<Subscription[]> {
  const { data } = await adminAxios.get<{ data: Subscription[] }>(`/api/v1/admin/tenants/${tenantId}/subscriptions`)
  return data.data
}

export interface TenantStats {
  products_count:  number
  sales_count:     number
  customers_count: number
  users_count:     number
  sales_revenue:   number
  last_sale_at:    string | null
}

export async function getTenantStats(tenantId: number): Promise<TenantStats> {
  const { data } = await adminAxios.get<{ data: TenantStats }>(`/api/v1/admin/tenants/${tenantId}/stats`)
  return data.data
}

// ── Paramètres du site ────────────────────────────────────────────────────────

export interface SiteSettingsData {
  id:                          number
  contact_email:               string | null
  contact_whatsapp:            string | null
  contact_address:             string | null
  contact_hours:               string | null
  facebook_url:                string | null
  twitter_url:                 string | null
  linkedin_url:                string | null
  instagram_url:               string | null
  tenant_deletion_grace_days:  number
}

export type SiteSettingsForm = Omit<SiteSettingsData, 'id'>

export async function getAdminSiteSettings(): Promise<SiteSettingsData> {
  const { data } = await adminAxios.get<{ data: SiteSettingsData }>('/api/v1/admin/site-settings')
  return data.data
}

export async function updateAdminSiteSettings(body: SiteSettingsForm): Promise<SiteSettingsData> {
  const { data } = await adminAxios.put<{ data: SiteSettingsData }>('/api/v1/admin/site-settings', body)
  return data.data
}

