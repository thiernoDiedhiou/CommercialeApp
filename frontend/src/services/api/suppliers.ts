import apiClient from '@/lib/axios'
import type { Supplier, CreateSupplierData, PaginatedResponse } from '@/types'

function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

export async function getSuppliers(params: {
  search?: string
  is_active?: boolean
  page?: number
} = {}): Promise<PaginatedResponse<Supplier>> {
  const { data } = await apiClient.get<PaginatedResponse<Supplier>>('/api/v1/suppliers', {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function getSupplier(id: number): Promise<Supplier> {
  const { data } = await apiClient.get<{ data: Supplier }>(`/api/v1/suppliers/${id}`)
  return data.data
}

export async function createSupplier(body: CreateSupplierData): Promise<Supplier> {
  const { data } = await apiClient.post<{ data: Supplier }>('/api/v1/suppliers', body)
  return data.data
}

export async function updateSupplier(id: number, body: Partial<CreateSupplierData>): Promise<Supplier> {
  const { data } = await apiClient.put<{ data: Supplier }>(`/api/v1/suppliers/${id}`, body)
  return data.data
}

export async function deleteSupplier(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/suppliers/${id}`)
}
