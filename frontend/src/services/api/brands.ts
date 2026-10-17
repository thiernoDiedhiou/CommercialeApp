import apiClient, { API } from '@/lib/axios'
import type { Brand, CreateBrandData } from '@/types'

export async function getBrands(): Promise<Brand[]> {
  const { data } = await apiClient.get<{ data: Brand[] }>(`${API}/brands`)
  return data.data
}

export async function createBrand(body: CreateBrandData): Promise<Brand> {
  const { data } = await apiClient.post<{ data: Brand }>(`${API}/brands`, body)
  return data.data
}

export async function updateBrand(uid: string, body: CreateBrandData): Promise<Brand> {
  const { data } = await apiClient.put<{ data: Brand }>(`${API}/brands/${uid}`, body)
  return data.data
}

export async function deleteBrand(uid: string): Promise<void> {
  await apiClient.delete(`${API}/brands/${uid}`)
}
