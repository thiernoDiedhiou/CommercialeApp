import apiClient, { API } from '@/lib/axios'
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
  const { data } = await apiClient.get<PaginatedResponse<Supplier>>(`${API}/suppliers`, {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function getSupplier(uid: string): Promise<Supplier> {
  const { data } = await apiClient.get<{ data: Supplier }>(`${API}/suppliers/${uid}`)
  return data.data
}

export async function createSupplier(body: CreateSupplierData): Promise<Supplier> {
  const { data } = await apiClient.post<{ data: Supplier }>(`${API}/suppliers`, body)
  return data.data
}

export async function updateSupplier(uid: string, body: Partial<CreateSupplierData>): Promise<Supplier> {
  const { data } = await apiClient.put<{ data: Supplier }>(`${API}/suppliers/${uid}`, body)
  return data.data
}

export async function deleteSupplier(uid: string): Promise<void> {
  await apiClient.delete(`${API}/suppliers/${uid}`)
}
