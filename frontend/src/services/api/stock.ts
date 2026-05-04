import apiClient from '@/lib/axios'
import type { StockMovement, StockAlert, ExpiringSoon, PaginatedResponse } from '@/types'

function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

export async function getMovements(
  params: {
    type?: string
    product_id?: number
    from?: string
    to?: string
    page?: number
  } = {},
): Promise<PaginatedResponse<StockMovement>> {
  const { data } = await apiClient.get<PaginatedResponse<StockMovement>>(
    '/api/v1/stock/movements',
    { params: clean(params as Record<string, unknown>) },
  )
  return data
}

export async function getAlerts(
  params: {
    search?: string
    category_id?: number | null
    page?: number
  } = {},
): Promise<PaginatedResponse<StockAlert>> {
  const { data } = await apiClient.get<PaginatedResponse<StockAlert>>(
    '/api/v1/stock/alerts',
    { params: clean(params as Record<string, unknown>) },
  )
  return data
}

export async function getExpiring(
  params: { page?: number } = {},
): Promise<PaginatedResponse<ExpiringSoon>> {
  const { data } = await apiClient.get<PaginatedResponse<ExpiringSoon>>(
    '/api/v1/stock/expiring',
    { params: clean(params as Record<string, unknown>) },
  )
  return data
}

export interface AdjustStockData {
  product_id: number
  variant_id?: number | null
  lot_id?: number | null
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  note?: string | null
  unit_cost?: number | null
}

export async function adjustStock(
  payload: AdjustStockData,
): Promise<{ data: StockMovement; stock_after: number }> {
  const { data } = await apiClient.post('/api/v1/stock/adjust', payload)
  return data
}
