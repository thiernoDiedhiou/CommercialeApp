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
  slug: string
  currency: string
  sector: string
  rccm: string | null
  ninea: string | null
  primary_color: string | null
  secondary_color: string | null
  logo_url: string | null
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

export interface Brand {
  id: number
  name: string
}

export interface CreateBrandData {
  name: string
}

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
  brand_id: number | null
  image_path: string | null
  image_url: string | null
  category?: Category
  brand?: Brand
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
  quantity_received: number
  quantity_remaining: number
  purchase_price: string | null
  is_active: boolean
  notes: string | null
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
  is_active?: boolean
}

// ── Product Import ────────────────────────────────────────────────────────

export interface ImportError {
  row: number
  message: string
}

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: ImportError[]
}

// ── Suppliers ─────────────────────────────────────────────────────────────

export interface Supplier {
  id: number
  name: string
  phone: string | null
  country: string
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
}

export interface CreateSupplierData {
  name: string
  country?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  is_active?: boolean
}

// ── Purchases ─────────────────────────────────────────────────────────────

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled'

export interface PurchaseOrderItem {
  id: number
  purchase_order_id: number
  product_id: number
  product_variant_id: number | null
  quantity_ordered: string
  quantity_received: string
  unit_cost: string
  product?: Pick<Product, 'id' | 'name' | 'unit' | 'has_expiry'>
  variant?: Pick<ProductVariant, 'id' | 'attribute_summary'>
}

export interface PurchaseOrder {
  id: number
  reference: string
  status: PurchaseOrderStatus
  expected_at: string | null
  received_at: string | null
  notes: string | null
  created_at: string
  items_count?: number
  supplier?: Pick<Supplier, 'id' | 'name'> | null
  user?: Pick<User, 'id' | 'name'>
  items?: PurchaseOrderItem[]
}

export interface CreatePurchaseOrderData {
  supplier_id?: number | null
  expected_at?: string | null
  notes?: string | null
  items: {
    product_id: number
    product_variant_id?: number | null
    quantity_ordered: number
    unit_cost: number
  }[]
}

export type UpdatePurchaseOrderData = Partial<CreatePurchaseOrderData>

export interface ReceiveItemData {
  id: number
  quantity_received: number
  lot_number?: string
  expiry_date?: string
}

// ── Customers ─────────────────────────────────────────────────────────────

export interface Customer {
  id: number
  name: string
  phone: string | null
  country: string       // ISO 3166-1 alpha-2, ex: 'SN'
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
  outstanding_balance: number
  unpaid_sales_count: number
}

/** Ligne du rapport créances GET /debts */
export interface DebtRow {
  id: number
  name: string
  phone: string | null
  email: string | null
  unpaid_sales_count: number
  outstanding_balance: number
}

export interface DebtPageResponse extends PaginatedResponse<DebtRow> {
  global_outstanding: number
}

export interface CreateCustomerData {
  name: string
  phone?: string | null
  country?: string
  email?: string | null
  address?: string | null
  notes?: string | null
  is_active?: boolean
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

// ── Users & Groups ────────────────────────────────────────────────────────

export interface Permission {
  id: number
  name: string
  display_name: string
  module: string
}

export interface Group {
  id: number
  name: string
  description: string | null
  users_count?: number
  permissions?: Permission[]
}

export interface UserWithGroups extends User {
  groups?: Pick<Group, 'id' | 'name'>[]
}

export interface CreateUserData {
  name: string
  email: string
  password: string
  is_active?: boolean
  group_ids?: number[]
}

export type UpdateUserData = Partial<Omit<CreateUserData, 'password'> & { password?: string }>

export interface CreateGroupData {
  name: string
  description?: string | null
}

// ── Invoices ──────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceItem {
  id: number
  invoice_id: number
  product_id: number | null
  description: string
  quantity: string
  unit_price: string
  discount: string
  total: string
  product?: Pick<Product, 'id' | 'name' | 'unit'>
}

export interface Invoice {
  id: number
  reference: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  subtotal: string
  discount_type: 'percent' | 'fixed' | null
  discount_value: string
  discount_amount: string
  tax_rate: string
  tax_amount: string
  total: string
  paid_amount: string
  notes: string | null
  footer: string | null
  sent_at: string | null
  paid_at: string | null
  cancelled_at: string | null
  created_at: string
  items_count?: number
  customer?: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address'> | null
  user?: Pick<User, 'id' | 'name'>
  items?: InvoiceItem[]
}

export interface CreateInvoiceItemData {
  product_id?: number | null
  description: string
  quantity: number
  unit_price: number
  discount?: number
}

export interface CreateInvoiceData {
  customer_id?: number | null
  issue_date: string
  due_date?: string | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number
  tax_rate?: number
  notes?: string | null
  footer?: string | null
  items: CreateInvoiceItemData[]
}

export type UpdateInvoiceData = Partial<CreateInvoiceData>

// ── Reports ───────────────────────────────────────────────────────────────

export interface ReportPeriod {
  from: string
  to: string
}

export interface SalesReportSummary {
  sales_count: number
  revenue: number
  profit: number
  average_basket: number
}

export interface SalesChartPoint {
  period: string
  sales_count: number
  revenue: number
  profit: number
}

export interface SalesReport {
  period: ReportPeriod
  summary: SalesReportSummary
  chart: SalesChartPoint[]
}

export interface ProductReportRow {
  product_id: number
  name: string
  category: string | null
  qty_sold: number
  revenue: number
  profit: number
}

export interface ProductsReport {
  period: ReportPeriod
  data: ProductReportRow[]
}

export interface StockReportSummary {
  total_in: number
  total_out: number
  total_return: number
  total_adjustment: number
}

export interface StockReportRow {
  product_id: number
  name: string
  total_in: number
  total_out: number
  total_return: number
  total_adjustment: number
  current_stock: number
}

export interface StockReport {
  period: ReportPeriod
  summary: StockReportSummary
  data: StockReportRow[]
}

// ── Sale Returns ──────────────────────────────────────────────────────────

export type RefundMethod = 'cash' | 'credit' | 'none'

export interface SaleReturnItem {
  id: number
  sale_return_id: number
  sale_item_id: number
  product_id: number
  product_variant_id: number | null
  lot_id: number | null
  quantity: string
  unit_weight: string | null
  unit_price: string
  total: string
  product?: Pick<Product, 'id' | 'name' | 'unit'>
  variant?: Pick<ProductVariant, 'id' | 'attribute_summary'>
  lot?: Pick<ProductLot, 'id' | 'lot_number'>
}

export interface SaleReturn {
  id: number
  reference: string
  sale_id: number
  user_id: number
  reason: string | null
  refund_method: RefundMethod
  total: string
  items_count?: number
  created_at: string
  sale?: Pick<Sale, 'id' | 'reference' | 'confirmed_at'>
  user?: Pick<User, 'id' | 'name'>
  items?: SaleReturnItem[]
}

export interface CreateSaleReturnData {
  reason?: string | null
  refund_method: RefundMethod
  items: { sale_item_id: number; quantity: number }[]
}

// ── API error ─────────────────────────────────────────────────────────────

export interface ApiError {
  message: string
  code?: string
  errors?: Record<string, string[]>
}
