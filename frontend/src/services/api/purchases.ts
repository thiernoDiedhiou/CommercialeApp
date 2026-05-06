import apiClient from '@/lib/axios'
import type {
  PurchaseOrder,
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  ReceiveItemData,
  PaginatedResponse,
} from '@/types'

function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

// ── Bons de commande ──────────────────────────────────────────────────────

export async function getPurchaseOrders(params: {
  status?: string
  supplier_id?: number
  search?: string
  page?: number
} = {}): Promise<PaginatedResponse<PurchaseOrder>> {
  const { data } = await apiClient.get<PaginatedResponse<PurchaseOrder>>('/api/v1/purchases', {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder> {
  const { data } = await apiClient.get<{ data: PurchaseOrder }>(`/api/v1/purchases/${id}`)
  return data.data
}

export async function createPurchaseOrder(body: CreatePurchaseOrderData): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<{ data: PurchaseOrder }>('/api/v1/purchases', body)
  return data.data
}

export async function updatePurchaseOrder(id: number, body: UpdatePurchaseOrderData): Promise<PurchaseOrder> {
  const { data } = await apiClient.put<{ data: PurchaseOrder }>(`/api/v1/purchases/${id}`, body)
  return data.data
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/purchases/${id}`)
}

export async function confirmPurchaseOrder(id: number): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<{ data: PurchaseOrder }>(`/api/v1/purchases/${id}/confirm`)
  return data.data
}

export async function receivePurchaseOrder(
  id: number,
  receptions: ReceiveItemData[],
): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<{ data: PurchaseOrder }>(`/api/v1/purchases/${id}/receive`, {
    receptions,
  })
  return data.data
}

export async function cancelPurchaseOrder(id: number): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<{ data: PurchaseOrder }>(`/api/v1/purchases/${id}/cancel`)
  return data.data
}
