import apiClient from '@/lib/axios'
import type {
  Product,
  ProductLot,
  ProductVariant,
  PaginatedResponse,
  StockMovement,
  CreateProductData,
  UpdateProductData,
  CreateVariantData,
} from '@/types'

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

export async function getProduct(uid: string): Promise<Product> {
  const { data } = await apiClient.get<{ data: Product }>(`/api/v1/products/${uid}`)
  return data.data
}

function appendToForm(form: FormData, body: Record<string, unknown>) {
  Object.entries(body).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    if (typeof v === 'boolean') form.append(k, v ? '1' : '0')
    else form.append(k, String(v))
  })
}

const MULTIPART_HEADERS = { headers: { 'Content-Type': undefined } }

export async function createProduct(body: CreateProductData, image?: File | null): Promise<Product> {
  if (image) {
    const form = new FormData()
    appendToForm(form, body as unknown as Record<string, unknown>)
    form.append('image', image)
    const { data } = await apiClient.post<{ data: Product }>('/api/v1/products', form, MULTIPART_HEADERS)
    return data.data
  }
  const { data } = await apiClient.post<{ data: Product }>('/api/v1/products', body)
  return data.data
}

export async function updateProduct(
  uid: string,
  body: UpdateProductData,
  image?: File | null,
  removeImage?: boolean,
): Promise<Product> {
  if (image || removeImage) {
    const form = new FormData()
    form.append('_method', 'PUT')
    appendToForm(form, body as unknown as Record<string, unknown>)
    if (image) form.append('image', image)
    if (removeImage) form.append('remove_image', '1')
    const { data } = await apiClient.post<{ data: Product }>(`/api/v1/products/${uid}`, form, MULTIPART_HEADERS)
    return data.data
  }
  const { data } = await apiClient.put<{ data: Product }>(`/api/v1/products/${uid}`, body)
  return data.data
}

export async function deleteProduct(uid: string): Promise<void> {
  await apiClient.delete(`/api/v1/products/${uid}`)
}

export async function getProductStockMovements(
  productUid: string,
  params: { page?: number } = {},
): Promise<PaginatedResponse<StockMovement>> {
  const { data } = await apiClient.get<PaginatedResponse<StockMovement>>(
    `/api/v1/products/${productUid}/stock-movements`,
    { params: clean(params) },
  )
  return data
}

// ── Variantes ─────────────────────────────────────────────────────────────

export async function getVariants(productUid: string): Promise<ProductVariant[]> {
  const { data } = await apiClient.get<{ data: ProductVariant[] }>(
    `/api/v1/products/${productUid}/variants`,
  )
  return data.data
}

export async function createVariant(
  productUid: string,
  body: CreateVariantData,
): Promise<ProductVariant> {
  const { data } = await apiClient.post<{ data: ProductVariant }>(
    `/api/v1/products/${productUid}/variants`,
    body,
  )
  return data.data
}

export async function updateVariant(
  productUid: string,
  variantUid: string,
  body: Partial<Omit<CreateVariantData, 'attribute_value_ids'>>,
): Promise<ProductVariant> {
  const { data } = await apiClient.put<{ data: ProductVariant }>(
    `/api/v1/products/${productUid}/variants/${variantUid}`,
    body,
  )
  return data.data
}

export async function deleteVariant(productUid: string, variantUid: string): Promise<void> {
  await apiClient.delete(`/api/v1/products/${productUid}/variants/${variantUid}`)
}

// ── Lots (gardent l'id entier — ProductLot n'a pas de uid) ────────────────

export async function getProductLots(productUid: string): Promise<ProductLot[]> {
  const { data } = await apiClient.get<{ data: ProductLot[] }>(`/api/v1/products/${productUid}/lots`)
  return data.data
}

export async function createProductLot(
  productUid: string,
  body: {
    lot_number: string
    expiry_date?: string | null
    quantity: number
    purchase_price?: number | null
    product_variant_id?: number | null
    notes?: string | null
  },
): Promise<ProductLot> {
  const { data } = await apiClient.post<{ data: ProductLot }>(`/api/v1/products/${productUid}/lots`, body)
  return data.data
}

export async function updateProductLot(
  productUid: string,
  lotId: number,
  body: { expiry_date?: string | null; is_active?: boolean; notes?: string | null },
): Promise<ProductLot> {
  const { data } = await apiClient.put<{ data: ProductLot }>(`/api/v1/products/${productUid}/lots/${lotId}`, body)
  return data.data
}

export async function regularizeProductLots(
  productUid: string,
  body: { lot_number?: string; expiry_date?: string | null; notes?: string | null },
): Promise<{ data: ProductLot; orphaned_absorbed: number }> {
  const { data } = await apiClient.post<{ data: ProductLot; orphaned_absorbed: number }>(
    `/api/v1/products/${productUid}/lots/regularize`,
    body,
  )
  return data
}
