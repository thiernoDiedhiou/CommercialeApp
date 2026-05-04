import apiClient from '@/lib/axios'
import type { Sale, Payment, PaginatedResponse } from '@/types'

function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

export async function getSales(params: {
  search?: string
  status?: string
  from?: string
  to?: string
  page?: number
} = {}): Promise<PaginatedResponse<Sale>> {
  const { data } = await apiClient.get<PaginatedResponse<Sale>>('/api/v1/sales', {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function getSale(id: number): Promise<Sale> {
  const { data } = await apiClient.get<{ data: Sale }>(`/api/v1/sales/${id}`)
  return data.data
}

export async function cancelSale(id: number): Promise<Sale> {
  const { data } = await apiClient.post<{ data: Sale }>(`/api/v1/sales/${id}/cancel`)
  return data.data
}

export async function addPayment(
  id: number,
  body: { method: string; amount: number; reference?: string; paid_at?: string },
): Promise<Payment> {
  const { data } = await apiClient.post<{ data: Payment }>(`/api/v1/sales/${id}/payments`, body)
  return data.data
}

/**
 * Télécharge le PDF via axios (bearer token inclus automatiquement),
 * crée une URL objet et l'ouvre dans un nouvel onglet.
 */
export async function openSalePdf(id: number): Promise<void> {
  const response = await apiClient.get(`/api/v1/sales/${id}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data as Blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
