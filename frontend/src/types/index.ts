// ── Auth ──────────────────────────────────────────────────────────────────

export interface User {
  id: number
  name: string
  email: string
  avatar: string | null
  is_active: boolean
}

export interface TenantInfo {
  name: string
  currency: string
  sector: string
  primary_color: string | null
  secondary_color: string | null
}

export interface LoginResponse {
  token: string
  data: {
    user: User
    permissions: string[]
    tenant: TenantInfo
  }
}

// ── Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export interface DashboardToday {
  sales_count: number
  revenue: number       // CA confirmé du jour
  profit: number        // revenue − coût
  pending_amount: number // montant dû (ventes non intégralement payées)
}

export interface WeekChartPoint {
  date: string          // 'YYYY-MM-DD'
  label: string         // 'Lun', 'Mar', etc.
  revenue: number
  count: number
}

export interface TopProduct {
  product_id: number
  product_name: string
  quantity_sold: number
  revenue: number
}

export interface StockAlert {
  product_id: number
  product_name: string
  variant_id: number | null
  variant_summary: string | null
  current_stock: number
  threshold: number
  category_name: string | null
  unit: string | null
}

export interface ExpiringSoon {
  product_id: number
  product_name: string
  variant_id: number | null
  variant_summary: string | null
  lot_number: string
  expiry_date: string
  days_remaining: number
  quantity_remaining: number
}

export interface DashboardSummary {
  today: DashboardToday
  week_chart: WeekChartPoint[]
  top_products: TopProduct[]
  stock_alerts: StockAlert[]
  expiring_soon: ExpiringSoon[]
  /** { cash: 150000, mobile_money: 75000, ... } */
  by_payment_method: Record<string, number>
  recent_sales: Sale[]
}

// ── Categories ────────────────────────────────────────────────────────────

export interface Category {
  id: number
  name: string
  slug: string
  parent_id: number | null
  description: string | null
  children?: Category[]
}

export interface CreateCategoryData {
  name: string
  parent_id?: number | null
  description?: string | null
}

// ── Attributes & Values ───────────────────────────────────────────────────

export interface AttributeValue {
  id: number
  product_attribute_id: number
  value: string
  slug: string
  color_hex: string | null
  sort_order: number
}

export interface ProductAttribute {
  id: number
  name: string
  slug: string
  sort_order: number
  values: AttributeValue[]
}

// ── Products ──────────────────────────────────────────────────────────────

export interface Product {
  id: number
  name: string
  slug: string
  description: string | null
  sku: string | null
  barcode: string | null
  price: string
  cost_price: string
  stock_quantity: number
  alert_threshold: number | null
  unit: string | null
  has_variants: boolean
  is_weight_based: boolean
  has_expiry: boolean
  is_active: boolean
  category_id: number | null
  category?: Category
  variants?: ProductVariant[]
}

export interface ProductVariant {
  id: number
  product_id: number
  sku: string | null
  barcode: string | null
  attribute_summary: string
  price: string
  cost_price: string
  stock_quantity: number
  alert_threshold: number | null
  is_active: boolean
  attributeValues?: AttributeValue[]
}

export interface ProductLot {
  id: number
  product_id: number
  product_variant_id: number | null
  lot_number: string
  expiry_date: string | null
  quantity_remaining: number
  is_active: boolean
}

export interface CreateProductData {
  name: string
  category_id?: number | null
  sku?: string | null
  barcode?: string | null
  price: number
  cost_price?: number | null
  description?: string | null
  unit?: string | null
  has_variants?: boolean
  is_weight_based?: boolean
  has_expiry?: boolean
  alert_threshold?: number | null
  /** Obligatoire si has_variants = true */
  attribute_value_ids?: number[]
}

/** has_variants est immuable après création — exclus de l'update */
export type UpdateProductData = Partial<Omit<CreateProductData, 'has_variants'>>

export interface CreateVariantData {
  attribute_value_ids: number[]
  sku?: string | null
  barcode?: string | null
  price?: number | null
  cost_price?: number | null
  alert_threshold?: number | null
}

// ── Customers ─────────────────────────────────────────────────────────────

export interface Customer {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
}

/** Customer enrichi avec les stats calculées par GET /customers/{id} */
export interface CustomerDetail extends Customer {
  sales_count: number
  total_purchases: number
  last_purchase_at: string | null
}

export interface CreateCustomerData {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

// ── Sales ─────────────────────────────────────────────────────────────────

export interface Sale {
  id: number
  reference: string
  created_at: string
  subtotal: string
  discount_type: 'percent' | 'fixed' | null
  discount_value: string
  discount_amount: string
  tax_amount: string
  total: string
  paid_amount: string
  status: 'confirmed' | 'cancelled' | 'draft'
  note: string | null
  confirmed_at: string | null
  cancelled_at: string | null
  customer?: Customer
  user?: Pick<User, 'id' | 'name'>
  items?: SaleItem[]
  payments?: Payment[]
}

export interface SaleItem {
  id: number
  product_id: number
  variant_id: number | null
  lot_id: number | null
  quantity: number
  unit_weight: number | null
  unit_price: string
  cost_price: string
  discount: string
  total: string
  product?: Pick<Product, 'id' | 'name' | 'unit'>
  variant?: Pick<ProductVariant, 'id' | 'attribute_summary'>
  lot?: Pick<ProductLot, 'id' | 'lot_number'>
}

export interface Payment {
  id: number
  method: string
  amount: string
  reference: string | null
  paid_at: string
}

// ── Stock ─────────────────────────────────────────────────────────────────

export interface StockMovement {
  id: number
  product_id: number
  product_variant_id: number | null
  lot_id: number | null
  user_id: number
  type: 'in' | 'out' | 'adjustment' | 'return'
  quantity: number
  unit_cost: string | null
  stock_before: number
  stock_after: number
  source: string
  notes: string | null
  created_at: string
  product?: Pick<Product, 'id' | 'name'>
  variant?: Pick<ProductVariant, 'id' | 'attribute_summary'>
  lot?: Pick<ProductLot, 'id' | 'lot_number'>
  user?: Pick<User, 'id' | 'name'>
}

// ── POS ───────────────────────────────────────────────────────────────────

export interface PosSession {
  id: number
  user_id: number
  opened_at: string
  closed_at: string | null
  opening_cash: number
  closing_cash: number | null
  status: 'open' | 'closed'
  notes: string | null
}

export interface PosDraft {
  id: number
  name: string | null
  cart_data: object
  created_at: string
}

// ── API error ─────────────────────────────────────────────────────────────

export interface ApiError {
  message: string
  code?: string
  errors?: Record<string, string[]>
}
