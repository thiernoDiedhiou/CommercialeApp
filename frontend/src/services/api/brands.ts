import apiClient from '@/lib/axios'
import type { Brand, CreateBrandData } from '@/types'

export async function getBrands(): Promise<Brand[]> {
  const { data } = await apiClient.get<{ data: Brand[] }>('/api/v1/brands')
  return data.data
}

export async function createBrand(body: CreateBrandData): Promise<Brand> {
  const { data } = await apiClient.post<{ data: Brand }>('/api/v1/brands', body)
  return data.data
}

export async function updateBrand(uid: string, body: CreateBrandData): Promise<Brand> {
  const { data } = await apiClient.put<{ data: Brand }>(`/api/v1/brands/${uid}`, body)
  return data.data
}

export async function deleteBrand(uid: string): Promise<void> {
  await apiClient.delete(`/api/v1/brands/${uid}`)
}
