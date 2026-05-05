import apiClient from '@/lib/axios'
import type {
  Product,
  ProductVariant,
  PaginatedResponse,
  StockMovement,
  CreateProductData,
  UpdateProductData,
  CreateVariantData,
} from '@/types'

/** Retire les valeurs undefined/null/vide pour ne pas polluer la query string. */
function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

// ── Produits ──────────────────────────────────────────────────────────────

export async function getProducts(params: {
  search?: string
  category_id?: number
  has_variants?: boolean
  is_active?: boolean
  page?: number
} = {}): Promise<PaginatedResponse<Product>> {
  const { data } = await apiClient.get<PaginatedResponse<Product>>('/api/v1/products', {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function getProduct(id: number): Promise<Product> {
  const { data } = await apiClient.get<{ data: Product }>(`/api/v1/products/${id}`)
  return data.data
}

export async function createProduct(body: CreateProductData, image?: File | null): Promise<Product> {
  if (image) {
    const form = new FormData()
    Object.entries(body).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v))
    })
    form.append('image', image)
    const { data } = await apiClient.post<{ data: Product }>('/api/v1/products', form)
    return data.data
  }
  const { data } = await apiClient.post<{ data: Product }>('/api/v1/products', body)
  return data.data
}

export async function updateProduct(
  id: number,
  body: UpdateProductData,
  image?: File | null,
  removeImage?: boolean,
): Promise<Product> {
  if (image || removeImage) {
    const form = new FormData()
    form.append('_method', 'PUT')
    Object.entries(body).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v))
    })
    if (image) form.append('image', image)
    if (removeImage) form.append('remove_image', '1')
    const { data } = await apiClient.post<{ data: Product }>(`/api/v1/products/${id}`, form)
    return data.data
  }
  const { data } = await apiClient.put<{ data: Product }>(`/api/v1/products/${id}`, body)
  return data.data
}

export async function deleteProduct(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/products/${id}`)
}

export async function getProductStockMovements(
  productId: number,
  params: { page?: number } = {},
): Promise<PaginatedResponse<StockMovement>> {
  const { data } = await apiClient.get<PaginatedResponse<StockMovement>>(
    `/api/v1/products/${productId}/stock-movements`,
    { params: clean(params) },
  )
  return data
}

// ── Variantes ─────────────────────────────────────────────────────────────

export async function getVariants(productId: number): Promise<ProductVariant[]> {
  const { data } = await apiClient.get<{ data: ProductVariant[] }>(
    `/api/v1/products/${productId}/variants`,
  )
  return data.data
}

export async function createVariant(
  productId: number,
  body: CreateVariantData,
): Promise<ProductVariant> {
  const { data } = await apiClient.post<{ data: ProductVariant }>(
    `/api/v1/products/${productId}/variants`,
    body,
  )
  return data.data
}

export async function updateVariant(
  productId: number,
  variantId: number,
  body: Partial<Omit<CreateVariantData, 'attribute_value_ids'>>,
): Promise<ProductVariant> {
  const { data } = await apiClient.put<{ data: ProductVariant }>(
    `/api/v1/products/${productId}/variants/${variantId}`,
    body,
  )
  return data.data
}

export async function deleteVariant(productId: number, variantId: number): Promise<void> {
  await apiClient.delete(`/api/v1/products/${productId}/variants/${variantId}`)
}
