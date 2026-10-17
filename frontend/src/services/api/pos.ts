import apiClient, { API } from '@/lib/axios'
import type { Product, PosSession, PosSessionWithStats, PosDraft } from '@/types'

export interface CreateSalePayload {
  items: {
    product_id: number
    variant_id?: number | null
    lot_id?: number | null
    quantity: number
    unit_weight?: number | null
    unit_price: number
    discount?: number
  }[]
  payments: { method: string; amount: number; reference?: string }[]
  customer_id?: number | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number
  note?: string | null
  offline_id?: string
  session_id?: number | null
}

export async function getPosProducts(params?: {
  search?: string
  category_id?: number | null
}): Promise<Product[]> {
  const { data } = await apiClient.get<Product[]>(`${API}/pos/products`, { params })
  return Array.isArray(data) ? data : (data as { data: Product[] }).data ?? []
}

export async function getSessions(page = 1): Promise<{
  data: PosSessionWithStats[]
  current_page: number
  last_page: number
  total: number
}> {
  const { data } = await apiClient.get(`${API}/pos/sessions`, { params: { page } })
  return data
}

export async function getCurrentSession(): Promise<PosSession | null> {
  const { data } = await apiClient.get(`${API}/pos/session/current`)
  return data.session
}

export async function openSession(payload: {
  opening_cash?: number
  notes?: string
}): Promise<PosSession> {
  const { data } = await apiClient.post(`${API}/pos/session/open`, payload)
  return data.session
}

export async function closeSession(
  id: number,
  payload: { closing_cash: number; notes?: string },
) {
  const { data } = await apiClient.post(`${API}/pos/session/${id}/close`, payload)
  return data
}

export async function syncOffline(
  sales: object[],
): Promise<{ synced: number; skipped: number; errors: number }> {
  const { data } = await apiClient.post(`${API}/pos/sync`, { sales })
  return data
}

export async function createPosSale(payload: CreateSalePayload) {
  const { data } = await apiClient.post(`${API}/sales`, payload)
  return data
}

export async function getDrafts(): Promise<PosDraft[]> {
  const { data } = await apiClient.get(`${API}/pos/drafts`)
  return Array.isArray(data) ? data : (data.data ?? [])
}

export async function saveDraft(payload: {
  name?: string | null
  cart_data: object
}): Promise<PosDraft> {
  const { data } = await apiClient.post(`${API}/pos/drafts`, payload)
  return data.data ?? data
}

export async function updateDraft(
  id: number,
  payload: { name?: string | null; cart_data: object },
): Promise<PosDraft> {
  const { data } = await apiClient.put(`${API}/pos/drafts/${id}`, payload)
  return data.data ?? data
}

export async function deleteDraft(id: number): Promise<void> {
  await apiClient.delete(`${API}/pos/drafts/${id}`)
}
