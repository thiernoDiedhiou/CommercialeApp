import apiClient, { API } from '@/lib/axios'
import type { StockTransfer } from '@/types'

export interface CreateTransferData {
  from_branch_uid: string
  to_branch_uid:   string
  notes?:          string
  items: {
    product_uid:         string
    product_variant_uid?: string
    quantity:            number
    notes?:              string
  }[]
}

export async function getStockTransfers(params?: {
  status?:     string
  branch_uid?: string
}): Promise<{ data: StockTransfer[]; meta: unknown }> {
  const { data } = await apiClient.get(`${API}/stock/transfers`, { params })
  return data
}

export async function getStockTransfer(uid: string): Promise<StockTransfer> {
  const { data } = await apiClient.get<{ data: StockTransfer }>(`${API}/stock/transfers/${uid}`)
  return data.data
}

export async function createStockTransfer(payload: CreateTransferData): Promise<StockTransfer> {
  const { data } = await apiClient.post<{ data: StockTransfer }>(`${API}/stock/transfers`, payload)
  return data.data
}

export async function sendStockTransfer(uid: string): Promise<StockTransfer> {
  const { data } = await apiClient.post<{ data: StockTransfer }>(`${API}/stock/transfers/${uid}/send`)
  return data.data
}

export async function receiveStockTransfer(uid: string): Promise<StockTransfer> {
  const { data } = await apiClient.post<{ data: StockTransfer }>(`${API}/stock/transfers/${uid}/receive`)
  return data.data
}

export async function cancelStockTransfer(uid: string): Promise<StockTransfer> {
  const { data } = await apiClient.post<{ data: StockTransfer }>(`${API}/stock/transfers/${uid}/cancel`)
  return data.data
}
