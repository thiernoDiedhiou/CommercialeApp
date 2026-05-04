import apiClient from '@/lib/axios'
import type { Category, CreateCategoryData } from '@/types'

/**
 * GET /api/v1/categories
 * Retourne l'arbre complet (avec children) sans pagination.
 */
export async function getCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<{ data: Category[] }>('/api/v1/categories')
  return data.data
}

export async function createCategory(body: CreateCategoryData): Promise<Category> {
  const { data } = await apiClient.post<{ data: Category }>('/api/v1/categories', body)
  return data.data
}

export async function updateCategory(
  id: number,
  body: Partial<CreateCategoryData>,
): Promise<Category> {
  const { data } = await apiClient.put<{ data: Category }>(`/api/v1/categories/${id}`, body)
  return data.data
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/categories/${id}`)
}
