import apiClient from '@/lib/axios'
import type { ProductAttribute, AttributeValue } from '@/types'

/**
 * GET /api/v1/attributes
 * Retourne tous les attributs avec leurs valeurs (sans pagination).
 */
export async function getAttributes(): Promise<ProductAttribute[]> {
  const { data } = await apiClient.get<{ data: ProductAttribute[] }>('/api/v1/attributes')
  return data.data
}

export async function createAttribute(body: {
  name: string
  slug?: string
  sort_order?: number
}): Promise<ProductAttribute> {
  const { data } = await apiClient.post<{ data: ProductAttribute }>('/api/v1/attributes', body)
  return data.data
}

export async function deleteAttribute(attributeId: number): Promise<void> {
  await apiClient.delete(`/api/v1/attributes/${attributeId}`)
}

export async function createAttributeValue(
  attributeId: number,
  body: { value: string; color_hex?: string; sort_order?: number },
): Promise<AttributeValue> {
  const { data } = await apiClient.post<{ data: AttributeValue }>(
    `/api/v1/attributes/${attributeId}/values`,
    body,
  )
  return data.data
}

export async function deleteAttributeValue(
  attributeId: number,
  valueId: number,
): Promise<void> {
  await apiClient.delete(`/api/v1/attributes/${attributeId}/values/${valueId}`)
}
