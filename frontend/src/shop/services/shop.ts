import axios from 'axios'
import apiClient from '@/lib/axios'
import type { ShopConfig, ShopTheme, ShopOrderResult } from '@/shop/store/shopStore'

// ── Instance Axios publique (sans auth, sans X-Tenant-ID) ────────────────────

const shopApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: {
    Accept: 'application/json',
  },
})

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShopVariant {
  id                : number
  attribute_summary : string
  price             : number
  stock_quantity    : number
  is_active         : boolean
  color_hex         ?: string
}

export interface ShopProduct {
  id              : number
  name            : string
  slug            : string
  price           : number
  unit            : string | null
  has_variants    : boolean
  is_weight_based : boolean
  has_expiry      : boolean
  image_url       : string | null
  stock_quantity  : number | null
  min_price       : number | null
  category        : { id: number; name: string } | null
  variants        : ShopVariant[]
  description     ?: string
}

export interface ShopCategory {
  id             : number
  name           : string
  slug           : string
  products_count : number
}

export interface ShopConfigResponse {
  shop  : ShopConfig
  theme : ShopTheme
  seo   : { meta_title: string | null; meta_description: string | null }
}

export interface PaginatedProducts {
  data          : ShopProduct[]
  current_page  : number
  last_page     : number
  per_page      : number
  total         : number
  next_page_url : string | null
  prev_page_url : string | null
}

export interface OrderItem {
  product_id : number
  variant_id ?: number | null
  quantity   : number
}

export interface CreateOrderPayload {
  customer_name    : string
  customer_phone   : string
  customer_email  ?: string
  customer_address : string
  delivery_zone   ?: string
  payment_method   : 'cod' | 'whatsapp'
  notes           ?: string
  items            : OrderItem[]
}

export interface CreateOrderResponse {
  order        : ShopOrderResult
  whatsapp_url : string | null
}

// Admin
export interface ShopOrderAdmin {
  id               : number
  reference        : string
  customer_name    : string
  customer_phone   : string
  customer_email   : string | null
  customer_address : string
  delivery_zone    : string | null
  delivery_fee     : number
  subtotal         : number
  total            : number
  formatted_total  : string
  status           : string
  status_label     : string
  payment_method   : string
  payment_status   : string
  notes            : string | null
  items_count      : number | null
  confirmed_at     : string | null
  delivered_at     : string | null
  created_at       : string
  items           ?: ShopOrderAdminItem[]
}

export interface ShopOrderAdminItem {
  id           : number
  product_id   : number | null
  product_name : string
  variant_id   : number | null
  variant_name : string | null
  image_path   : string | null
  quantity     : number
  unit_price   : number
  total        : number
  product      : { id: number; name: string } | null
  variant      : { id: number; attribute_summary: string } | null
}

// ── API publique ──────────────────────────────────────────────────────────────

export async function getShopConfig(slug: string): Promise<ShopConfigResponse> {
  const { data } = await shopApi.get<ShopConfigResponse>(`/api/v1/public/${slug}/config`)
  return data
}

export async function getShopProducts(
  slug: string,
  params?: { category_id?: number; search?: string; page?: number; per_page?: number },
): Promise<PaginatedProducts> {
  const { data } = await shopApi.get<PaginatedProducts>(
    `/api/v1/public/${slug}/products`,
    { params },
  )
  return data
}

export async function getShopProduct(slug: string, productId: number): Promise<{ data: ShopProduct }> {
  const { data } = await shopApi.get<{ data: ShopProduct }>(
    `/api/v1/public/${slug}/products/${productId}`,
  )
  return data
}

export async function getShopCategories(slug: string): Promise<{ data: ShopCategory[] }> {
  const { data } = await shopApi.get<{ data: ShopCategory[] }>(
    `/api/v1/public/${slug}/categories`,
  )
  return data
}

export async function createShopOrder(
  slug: string,
  payload: CreateOrderPayload,
): Promise<CreateOrderResponse> {
  const { data } = await shopApi.post<CreateOrderResponse>(
    `/api/v1/public/${slug}/orders`,
    payload,
  )
  return data
}

// ── API admin (utilise apiClient tenant — Bearer + X-Tenant-ID) ──────────────

export async function getShopSettings(): Promise<{ data: Record<string, unknown> }> {
  const { data } = await apiClient.get('/api/v1/shop/settings')
  return data
}

export async function updateShopSettings(
  formData: FormData,
): Promise<{ data: Record<string, unknown> }> {
  const { data } = await apiClient.post('/api/v1/shop/settings/update', formData, {
    headers: { 'Content-Type': undefined }, // laisse le navigateur générer la boundary
  })
  return data
}

export async function toggleShopActive(): Promise<{ is_active: boolean; message: string }> {
  const { data } = await apiClient.post<{ is_active: boolean; message: string }>(
    '/api/v1/shop/settings/toggle-active',
  )
  return data
}

export async function getShopOrders(params?: {
  status ?: string
  from   ?: string
  to     ?: string
  search ?: string
  page   ?: number
}): Promise<{ data: ShopOrderAdmin[]; current_page: number; last_page: number; total: number }> {
  const { data } = await apiClient.get('/api/v1/shop/orders', { params })
  return data
}

export async function getShopOrder(id: number): Promise<{
  data         : ShopOrderAdmin
  whatsapp_url : string | null
}> {
  const { data } = await apiClient.get(`/api/v1/shop/orders/${id}`)
  return data
}

export async function updateShopOrderStatus(
  id     : number,
  status : string,
): Promise<{ data: ShopOrderAdmin }> {
  const { data } = await apiClient.put(`/api/v1/shop/orders/${id}/status`, { status })
  return data
}
