import apiClient, { API } from '@/lib/axios'

export interface TenantSettings {
  // Informations générales
  name:    string
  sector:  string
  locale:  string
  timezone: string
  country: string
  // Finances & devise
  currency: string
  // Contact
  phone:   string | null
  email:   string | null
  address: string | null
  city:    string | null
  // Infos légales
  rccm:  string | null
  ninea: string | null
  // Identité visuelle
  primary_color:   string | null
  secondary_color: string | null
  logo_url:        string | null
  // SMTP tenant
  smtp_host:         string | null
  smtp_port:         number | null
  smtp_encryption:   string | null
  smtp_username:     string | null
  smtp_password:     string | null
  smtp_from_address: string | null
  smtp_from_name:    string | null
  // Documents / facturation
  pdf_template:    string | null
  invoice_footer:  string | null
  invoice_prefix:  string | null
  // Fiscal
  default_vat_rate:     number
  vat_label:            string
  business_description: string | null
  // POS
  pos_payment_methods:    string[]
  pos_receipt_auto_print: boolean
}

export async function getTenantSettings(): Promise<TenantSettings> {
  const { data } = await apiClient.get<{ data: TenantSettings }>(`${API}/settings`)
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
      if (Array.isArray(v)) {
        v.forEach((item) => form.append(`${k}[]`, String(item)))
      } else {
        form.append(k, String(v))
      }
    })
    if (logo) form.append('logo', logo)
    if (removeLogo) form.append('remove_logo', '1')
    const { data } = await apiClient.post<{ data: TenantSettings }>(
      `${API}/settings`,
      form,
      { headers: { 'Content-Type': undefined } },
    )
    return data.data
  }
  const { data } = await apiClient.put<{ data: TenantSettings }>(`${API}/settings`, body)
  return data.data
}
