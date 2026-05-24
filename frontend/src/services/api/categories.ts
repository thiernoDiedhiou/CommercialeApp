import apiClient from '@/lib/axios'
import type { Category, CreateCategoryData } from '@/types'

const MULTIPART = { headers: { 'Content-Type': undefined } }

function toFormData(body: CreateCategoryData): FormData {
  const fd = new FormData()
  fd.append('name', body.name)
  if (body.parent_id != null) fd.append('parent_id', String(body.parent_id))
  if (body.description)       fd.append('description', body.description)
  if (body.image instanceof File) fd.append('image', body.image)
  if (body.remove_image)      fd.append('remove_image', '1')
  return fd
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<{ data: Category[] }>('/api/v1/categories')
  return data.data
}

export async function createCategory(body: CreateCategoryData): Promise<Category> {
  const { data } = await apiClient.post<{ data: Category }>(
    '/api/v1/categories',
    toFormData(body),
    MULTIPART,
  )
  return data.data
}

export async function updateCategory(
  id: number,
  body: Partial<CreateCategoryData>,
): Promise<Category> {
  const { data } = await apiClient.put<{ data: Category }>(
    `/api/v1/categories/${id}`,
    toFormData({ name: body.name ?? '', ...body }),
    MULTIPART,
  )
  return data.data
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/categories/${id}`)
}
