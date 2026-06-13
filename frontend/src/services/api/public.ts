import publicAxios from '@/lib/publicAxios'

// ── Plans publics ─────────────────────────────────────────────────────────────

export interface PublicPlan {
  id:                    number
  name:                  string
  slug:                  string
  tagline:               string | null
  badge:                 string | null
  description:           string | null
  features:              string[] | null
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
}

export async function getPublicPlans(): Promise<PublicPlan[]> {
  const { data } = await publicAxios.get<{ data: PublicPlan[] }>('/api/v1/public/plans')
  return data.data
}

// ── Inscription essai gratuit ─────────────────────────────────────────────────

export interface RegisterData {
  company_name:    string
  sector:          string
  currency?:       string
  phone?:          string | null
  admin_name:      string
  admin_email:     string
  admin_password:  string
}

export interface RegisterResponse {
  message: string
  api_key: string
  tenant:  { name: string; slug: string }
}

export async function registerTenant(body: RegisterData): Promise<RegisterResponse> {
  const { data } = await publicAxios.post<RegisterResponse>('/api/v1/public/register', body)
  return data
}

// ── Paramètres publics du site ────────────────────────────────────────────────

export interface PublicSiteSettings {
  contact_email:    string | null
  contact_whatsapp: string | null
  contact_address:  string | null
  contact_hours:    string | null
  facebook_url:     string | null
  twitter_url:      string | null
  linkedin_url:     string | null
  instagram_url:    string | null
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const { data } = await publicAxios.get<{ data: PublicSiteSettings }>('/api/v1/public/site-settings')
  return data.data
}

// ── Résolution slug → api_key ─────────────────────────────────────────────────

export async function resolveTenantSlug(slug: string): Promise<string> {
  const { data } = await publicAxios.get<{ slug: string; api_key: string }>(
    `/api/v1/public/tenant/${encodeURIComponent(slug)}`
  )
  return data.api_key
}
