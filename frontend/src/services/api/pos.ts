import apiClient from '@/lib/axios'
import type { Product, PosSession, PosDraft } from '@/types'

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
  const { data } = await apiClient.get<Product[]>('/api/v1/pos/products', { params })
  return Array.isArray(data) ? data : (data as { data: Product[] }).data ?? []
}

export async function getCurrentSession(): Promise<PosSession | null> {
  const { data } = await apiClient.get('/api/v1/pos/session/current')
  return data.session
}

export async function openSession(payload: {
  opening_cash?: number
  notes?: string
}): Promise<PosSession> {
  const { data } = await apiClient.post('/api/v1/pos/session/open', payload)
  return data.session
}

export async function closeSession(
  id: number,
  payload: { closing_cash: number; notes?: string },
) {
  const { data } = await apiClient.post(`/api/v1/pos/session/${id}/close`, payload)
  return data
}

export async function syncOffline(
  sales: object[],
): Promise<{ synced: number; skipped: number; errors: number }> {
  const { data } = await apiClient.post('/api/v1/pos/sync', { sales })
  return data
}

export async function createPosSale(payload: CreateSalePayload) {
  const { data } = await apiClient.post('/api/v1/sales', payload)
  return data
}

export async function getDrafts(): Promise<PosDraft[]> {
  const { data } = await apiClient.get('/api/v1/pos/drafts')
  return Array.isArray(data) ? data : (data.data ?? [])
}

export async function saveDraft(payload: {
  name?: string | null
  cart_data: object
}): Promise<PosDraft> {
  const { data } = await apiClient.post('/api/v1/pos/drafts', payload)
  return data.data ?? data
}

export async function updateDraft(
  id: number,
  payload: { name?: string | null; cart_data: object },
): Promise<PosDraft> {
  const { data } = await apiClient.put(`/api/v1/pos/drafts/${id}`, payload)
  return data.data ?? data
}

export async function deleteDraft(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/pos/drafts/${id}`)
}
