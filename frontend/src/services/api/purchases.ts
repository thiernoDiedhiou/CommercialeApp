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

export async function getPurchaseOrder(uid: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.get<{ data: PurchaseOrder }>(`/api/v1/purchases/${uid}`)
  return data.data
}

export async function createPurchaseOrder(body: CreatePurchaseOrderData): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<{ data: PurchaseOrder }>('/api/v1/purchases', body)
  return data.data
}

export async function updatePurchaseOrder(uid: string, body: UpdatePurchaseOrderData): Promise<PurchaseOrder> {
  const { data } = await apiClient.put<{ data: PurchaseOrder }>(`/api/v1/purchases/${uid}`, body)
  return data.data
}

export async function deletePurchaseOrder(uid: string): Promise<void> {
  await apiClient.delete(`/api/v1/purchases/${uid}`)
}

export async function confirmPurchaseOrder(uid: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<{ data: PurchaseOrder }>(`/api/v1/purchases/${uid}/confirm`)
  return data.data
}

export async function receivePurchaseOrder(
  uid: string,
  receptions: ReceiveItemData[],
): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<{ data: PurchaseOrder }>(`/api/v1/purchases/${uid}/receive`, {
    receptions,
  })
  return data.data
}

export async function cancelPurchaseOrder(uid: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<{ data: PurchaseOrder }>(`/api/v1/purchases/${uid}/cancel`)
  return data.data
}
