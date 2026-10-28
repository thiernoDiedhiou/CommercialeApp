import apiClient from '@/lib/axios'

export interface NewsletterSubscriber {
  id         : number
  email      : string
  is_active  : boolean
  created_at : string
}

export interface NewsletterCampaign {
  id               : number
  uid              : string
  subject          : string
  preview_text     : string | null
  body             : string
  design           : string | null  // JSON Unlayer (null = ancienne campagne sans éditeur visuel)
  status           : 'draft' | 'sending' | 'sent'
  recipients_count : number
  sent_at          : string | null
  created_at       : string
}

export interface MarketingStats {
  subscribers_total  : number
  subscribers_active : number
  campaigns_total    : number
  campaigns_sent     : number
  emails_sent        : number
}

// ── Statistiques ──────────────────────────────────────────────────────────────

export async function getMarketingStats(): Promise<{ data: MarketingStats }> {
  const { data } = await apiClient.get('/api/v1/marketing/stats')
  return data
}

// ── Abonnés ───────────────────────────────────────────────────────────────────

export async function getSubscribers(params?: {
  search ?: string
  active ?: boolean
  page   ?: number
}): Promise<{ data: NewsletterSubscriber[]; current_page: number; last_page: number; total: number }> {
  const { data } = await apiClient.get('/api/v1/marketing/subscribers', { params })
  return data
}

export async function toggleSubscriber(id: number): Promise<{ data: NewsletterSubscriber }> {
  const { data } = await apiClient.patch(`/api/v1/marketing/subscribers/${id}/toggle`)
  return data
}

export async function deleteSubscriber(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/marketing/subscribers/${id}`)
}

export function getExportUrl(): string {
  return '/api/v1/marketing/subscribers/export'
}

// ── Campagnes ─────────────────────────────────────────────────────────────────

export async function getCampaigns(page = 1): Promise<{
  data        : NewsletterCampaign[]
  current_page: number
  last_page   : number
  total       : number
}> {
  const { data } = await apiClient.get('/api/v1/marketing/campaigns', { params: { page } })
  return data
}

export async function getCampaign(uid: string): Promise<{ data: NewsletterCampaign }> {
  const { data } = await apiClient.get(`/api/v1/marketing/campaigns/${uid}`)
  return data
}

export async function createCampaign(payload: {
  subject      : string
  preview_text ?: string
  body         : string
  design       ?: string
}): Promise<{ data: NewsletterCampaign }> {
  const { data } = await apiClient.post('/api/v1/marketing/campaigns', payload)
  return data
}

export async function updateCampaign(uid: string, payload: Partial<{
  subject      : string
  preview_text : string
  body         : string
  design       : string
}>): Promise<{ data: NewsletterCampaign }> {
  const { data } = await apiClient.put(`/api/v1/marketing/campaigns/${uid}`, payload)
  return data
}

export async function uploadMarketingMedia(file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.append('image', file)
  const { data } = await apiClient.post<{ url: string }>('/api/v1/marketing/media', form, {
    headers: { 'Content-Type': undefined },
  })
  return data
}

export async function deleteCampaign(uid: string): Promise<void> {
  await apiClient.delete(`/api/v1/marketing/campaigns/${uid}`)
}

export async function sendCampaign(uid: string): Promise<{ message: string; subscribers: number }> {
  const { data } = await apiClient.post(`/api/v1/marketing/campaigns/${uid}/send`)
  return data
}
