import adminAxios from '@/lib/adminAxios'
import { API } from '@/lib/axios'

// ── Auth ──────────────────────────────────────────────────────────────────

export interface SuperAdminInfo {
  id: number
  name: string
  email: string
  avatar: string | null
}

export interface AdminLoginResponse {
  token: string
  data: SuperAdminInfo
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const { data } = await adminAxios.post<AdminLoginResponse>(`${API}/admin/auth/login`, { email, password })
  return data
}

export async function adminLogout(): Promise<void> {
  await adminAxios.post(`${API}/admin/auth/logout`)
}

export async function updateAdminProfile(body: {
  name: string
  current_password?: string
  password?: string
  password_confirmation?: string
}): Promise<SuperAdminInfo> {
  const { data } = await adminAxios.put<{ data: SuperAdminInfo }>(`${API}/admin/auth/profile`, body)
  return data.data
}

export async function uploadAdminAvatar(file: File): Promise<{ avatar: string }> {
  const form = new FormData()
  form.append('avatar', file)
  const { data } = await adminAxios.post<{ avatar: string }>(`${API}/admin/auth/avatar`, form, {
    headers: { 'Content-Type': undefined },
  })
  return data
}

export async function deleteAdminAvatar(): Promise<void> {
  await adminAxios.delete(`${API}/admin/auth/avatar`)
}

// ── Stats ─────────────────────────────────────────────────────────────────

export interface DangerTenant {
  tenant_id:       number
  tenant_uid:      string
  tenant_name:     string
  tenant_slug:     string
  plan_name?:      string | null
  status?:         string
  ends_at?:        string | null
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
  tenants_recent: { id: number; uid: string; name: string; sector: string; is_active: boolean; created_at: string }[]
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await adminAxios.get<{ data: AdminStats }>(`${API}/admin/stats`)
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
  uid:                    string
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
  rccm:                   string | null
  ninea:                  string | null
  admin_notes:            string | null
  smtp_configured:        boolean
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
  admin_notes?:     string | null
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
  const { data } = await adminAxios.get<PaginatedTenants>(`${API}/admin/tenants`, { params })
  return data
}

export async function restoreTenant(uid: string): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>(`${API}/admin/tenants/${uid}/restore`)
  return data.data
}

export async function scheduleTenantDeletion(uid: string): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>(`${API}/admin/tenants/${uid}/schedule-deletion`)
  return data.data
}

export async function cancelTenantDeletion(uid: string): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>(`${API}/admin/tenants/${uid}/cancel-deletion`)
  return data.data
}

export async function getAdminTenant(uid: string): Promise<{ data: AdminTenant; users: TenantUser[] }> {
  const { data } = await adminAxios.get<{ data: AdminTenant; users: TenantUser[] }>(`${API}/admin/tenants/${uid}`)
  return data
}

export async function createAdminTenant(body: CreateTenantData): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>(`${API}/admin/tenants`, body)
  return data.data
}

export async function updateAdminTenant(uid: string, body: UpdateTenantData): Promise<AdminTenant> {
  const { data } = await adminAxios.put<{ data: AdminTenant }>(`${API}/admin/tenants/${uid}`, body)
  return data.data
}

export async function suspendTenant(uid: string): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>(`${API}/admin/tenants/${uid}/suspend`)
  return data.data
}

export async function activateTenant(uid: string): Promise<AdminTenant> {
  const { data } = await adminAxios.post<{ data: AdminTenant }>(`${API}/admin/tenants/${uid}/activate`)
  return data.data
}

export async function deleteAdminTenant(uid: string): Promise<void> {
  await adminAxios.delete(`${API}/admin/tenants/${uid}`)
}

export async function rotateApiKey(uid: string): Promise<{ api_key: string; message: string }> {
  const { data } = await adminAxios.post<{ api_key: string; message: string }>(
    `${API}/admin/tenants/${uid}/rotate-api-key`,
  )
  return data
}

// ── Plans ─────────────────────────────────────────────────────────────────

export interface Plan {
  id:                    number
  uid:                   string
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
  const { data } = await adminAxios.get<{ data: Plan[] }>(`${API}/admin/plans`)
  return data.data
}

export async function getAdminPlan(uid: string): Promise<Plan> {
  const { data } = await adminAxios.get<{ data: Plan }>(`${API}/admin/plans/${uid}`)
  return data.data
}

export async function createAdminPlan(body: PlanFormData): Promise<Plan> {
  const { data } = await adminAxios.post<{ data: Plan }>(`${API}/admin/plans`, body)
  return data.data
}

export async function updateAdminPlan(uid: string, body: Partial<PlanFormData>): Promise<Plan> {
  const { data } = await adminAxios.put<{ data: Plan }>(`${API}/admin/plans/${uid}`, body)
  return data.data
}

export async function deleteAdminPlan(uid: string): Promise<void> {
  await adminAxios.delete(`${API}/admin/plans/${uid}`)
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

export async function getTenantSubscription(tenantUid: string): Promise<Subscription | null> {
  const { data } = await adminAxios.get<{ data: Subscription | null }>(`${API}/admin/tenants/${tenantUid}/subscription`)
  return data.data
}

export async function assignSubscription(tenantUid: string, body: {
  plan_id: number
  billing_cycle: string
  starts_at?: string
  ends_at?: string
  notes?: string
}): Promise<Subscription> {
  const { data } = await adminAxios.post<{ data: Subscription }>(`${API}/admin/tenants/${tenantUid}/subscription`, body)
  return data.data
}

export async function updateSubscription(tenantUid: string, body: {
  ends_at?: string | null
  status?: string
  notes?: string
}): Promise<Subscription> {
  const { data } = await adminAxios.put<{ data: Subscription }>(`${API}/admin/tenants/${tenantUid}/subscription`, body)
  return data.data
}

export async function getSubscriptions(params?: { status?: string; plan_id?: number; page?: number }): Promise<{
  data: (Subscription & { tenant: { id: number; uid: string; name: string; slug: string; is_active: boolean } })[]
  meta: { current_page: number; last_page: number; total: number; per_page: number }
  summary: SubscriptionSummary
}> {
  const { data } = await adminAxios.get(`${API}/admin/subscriptions`, { params })
  return data
}

export async function getTenantSubscriptionHistory(tenantUid: string): Promise<Subscription[]> {
  const { data } = await adminAxios.get<{ data: Subscription[] }>(`${API}/admin/tenants/${tenantUid}/subscriptions`)
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

export async function getTenantStats(tenantUid: string): Promise<TenantStats> {
  const { data } = await adminAxios.get<{ data: TenantStats }>(`${API}/admin/tenants/${tenantUid}/stats`)
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
  /** Lien de paiement/renouvellement — null jusqu'à l'activation des moyens de paiement */
  renewal_url:                 string | null
}

export type SiteSettingsForm = Omit<SiteSettingsData, 'id'>

export async function getAdminSiteSettings(): Promise<SiteSettingsData> {
  const { data } = await adminAxios.get<{ data: SiteSettingsData }>(`${API}/admin/site-settings`)
  return data.data
}

export async function updateAdminSiteSettings(body: SiteSettingsForm): Promise<SiteSettingsData> {
  const { data } = await adminAxios.put<{ data: SiteSettingsData }>(`${API}/admin/site-settings`, body)
  return data.data
}

