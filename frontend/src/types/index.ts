// ── Auth ──────────────────────────────────────────────────────────────────

export interface User {
  id: number
  uid: string
  name: string
  email: string
  locale: string | null
  avatar: string | null
  is_active: boolean
}

export interface SubscriptionInfo {
  status:         'trial' | 'active' | 'expired' | 'cancelled'
  plan_name:      string | null
  plan_slug:      string | null
  billing_cycle:  'trial' | 'monthly' | 'yearly' | 'lifetime'
  ends_at:        string | null
  days_remaining: number | null
}

export interface PlanFeatures {
  pos:            boolean
  invoicing:      boolean
  purchases:      boolean
  reports:        boolean
  shop:           boolean
  import_csv:     boolean
  stock_alerts:   boolean
  multi_user:     boolean
  custom_domain:  boolean
}

export interface Branch {
  uid: string
  name: string
  type: 'principal' | 'sync' | 'warehouse'
  address: string | null
  phone: string | null
  is_active: boolean
  display_order: number
  has_pos: boolean
  created_at: string
}

export interface TenantInfo {
  api_key: string
  name: string
  slug: string
  currency: string
  sector: string
  locale: string
  timezone: string
  rccm: string | null
  ninea: string | null
  primary_color: string | null
  secondary_color: string | null
  logo_url: string | null
}

export interface LoginResponse {
  token: string
  data: {
    user:         User
    permissions:  string[]
    tenant:       TenantInfo
    subscription: SubscriptionInfo | null
    plan_features: PlanFeatures | null
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
  sales_count          : number
  revenue              : number
  profit               : number
  pending_amount       : number
  pos_sales_count      : number
  pos_revenue          : number
  shop_orders_count    : number
  shop_orders_revenue  : number
}

export interface WeekChartPoint {
  date: string          // 'YYYY-MM-DD'
  label: string         // 'Lun', 'Mar', etc.
  revenue: number
  count: number
}

export interface TopProduct {
  product_id: number
  product_uid: string
  product_name: string
  image_url: string | null
  quantity_sold: number
  revenue: number
}

export interface StockAlert {
  product_id: number
  product_uid: string
  product_name: string
  image_url: string | null
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

export interface RecentTransaction {
  uid          : string
  reference    : string
  customer     : string | null
  total        : number
  status       : string
  channel      : 'pos' | 'shop'
  confirmed_at : string | null
  created_at   : string
}

export interface DashboardSummary {
  today: DashboardToday
  week_chart: WeekChartPoint[]
  top_products: TopProduct[]
  stock_alerts: StockAlert[]
  expiring_soon: ExpiringSoon[]
  by_payment_method: Record<string, number>
  recent_sales: RecentTransaction[]
}

// ── Categories ────────────────────────────────────────────────────────────

export interface Category {
  id: number
  uid: string
  name: string
  slug: string
  parent_id: number | null
  description: string | null
  image_url: string | null
  products_count?: number
  children?: Category[]
}

export interface CreateCategoryData {
  name: string
  parent_id?: number | null
  description?: string | null
  image?: File | null
  remove_image?: boolean
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
  uid: string
  name: string
}

export interface CreateBrandData {
  name: string
}

export interface Product {
  id: number
  uid: string
  name: string
  slug: string
  description: string | null
  sku: string | null
  barcode: string | null
  price: string
  compare_at_price: string | null
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
  uid: string
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
  uid: string
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

export interface ProductLotRegularizeResult {
  data: ProductLot
  orphaned_absorbed: number
}

export interface CreateProductData {
  name: string
  category_id?: number | null
  sku?: string | null
  barcode?: string | null
  price: number
  compare_at_price?: number | null
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
  uid: string
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
  uid: string
  reference: string
  status: PurchaseOrderStatus
  expected_at: string | null
  received_at: string | null
  notes: string | null
  created_at: string
  items_count?: number
  total_amount?: string | number | null
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
  uid: string
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
  uid: string
  name: string
  phone: string | null
  email: string | null
  unpaid_sales_count: number
  outstanding_balance: number
  oldest_debt_date: string | null
}

export interface DebtPageResponse extends PaginatedResponse<DebtRow> {
  global_outstanding: number
}

/** Vente impayée dans le détail d'un débiteur */
export interface DebtSale {
  uid: string
  reference: string
  sale_date: string
  total: number
  paid_amount: number
  remaining: number
}

/** Réponse GET /debts/{uid} */
export interface DebtDetail {
  customer: {
    uid: string
    name: string
    phone: string | null
    email: string | null
  }
  sales: DebtSale[]
  total_outstanding: number
  unpaid_count: number
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
  uid: string
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
  returns_count?: number
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

export interface PosSessionWithStats extends PosSession {
  user: { id: number; name: string }
  sales_count: number
  total_confirmed: number
  cash_difference: number | null
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
  uid: string
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
  is_active?: boolean
  group_ids?: number[]
}

export interface CreateUserResponse extends UserWithGroups {
  generated_password: string
}

export type UpdateUserData = Partial<Omit<CreateUserData, 'password'> & { password?: string }>

export interface CreateGroupData {
  name: string
  description?: string | null
}

// ── Invoices ──────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type InvoiceType   = 'invoice' | 'quote'

export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'check' | 'other'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:          'Espèces',
  bank_transfer: 'Virement bancaire',
  mobile_money:  'Mobile Money',
  check:         'Chèque',
  other:         'Autre',
}

export interface InvoicePayment {
  id: number
  invoice_id: number
  amount: string
  method: PaymentMethod
  paid_at: string
  reference: string | null
  note: string | null
  user?: Pick<User, 'id' | 'name'>
}

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
  uid: string
  type: InvoiceType
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
  pdf_template: string | null
  reminder_count: number
  last_reminder_at: string | null
  converted_to_id: number | null
  credit_note_for_id: number | null
  sent_at: string | null
  paid_at: string | null
  cancelled_at: string | null
  created_at: string
  items_count?: number
  customer?: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address'> | null
  user?: Pick<User, 'id' | 'name'>
  items?: InvoiceItem[]
  payments?: InvoicePayment[]
  credit_note_for?: { uid: string; reference: string } | null
  converted_to?:    { uid: string; reference: string } | null
}

export interface CreateInvoiceItemData {
  product_id?: number | null
  description: string
  quantity: number
  unit_price: number
  discount?: number
}

export interface CreateInvoiceData {
  type?: InvoiceType
  customer_id?: number | null
  issue_date: string
  due_date?: string | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number
  tax_rate?: number
  notes?: string | null
  footer?: string | null
  pdf_template?: string | null
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
  product_id:  number
  name:        string
  category:    string | null
  qty_sold:    number
  revenue:     number
  profit:      number
  margin_rate: number
}

export interface ProductsReport {
  period: ReportPeriod
  data:   ProductReportRow[]
}

export interface StockReportSummary {
  total_in:          number
  total_out:         number
  total_return:      number
  total_adjustment:  number
  total_stock_value: number
}

export interface StockReportRow {
  product_id:       number
  name:             string
  total_in:         number
  total_out:        number
  total_return:     number
  total_adjustment: number
  current_stock:    number
  stock_value:      number
}

export interface StockReport {
  period:  ReportPeriod
  summary: StockReportSummary
  data:    StockReportRow[]
}

// ── Stock Transfers ───────────────────────────────────────────────────────

export type StockTransferStatus = 'draft' | 'in_transit' | 'received' | 'cancelled'

export interface StockTransferBranch {
  uid:  string
  name: string
  type: 'principal' | 'sync' | 'warehouse'
}

export interface StockTransferItemType {
  id:       number
  quantity: number
  notes:    string | null
  product:  { uid: string; name: string; sku: string; unit: string } | null
  variant:  { uid: string; name: string; sku: string } | null
}

export interface StockTransfer {
  uid:          string
  reference:    string | null
  status:       StockTransferStatus
  notes:        string | null
  sent_at:      string | null
  received_at:  string | null
  created_at:   string
  from_branch:  StockTransferBranch | null
  to_branch:    StockTransferBranch | null
  created_by:   string | null
  received_by:  string | null
  items:        StockTransferItemType[] | null
  items_count:  number | null
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
  uid: string
  reference: string
  sale_id: number
  user_id: number
  reason: string | null
  refund_method: RefundMethod
  total: string
  items_count?: number
  created_at: string
  sale?: Pick<Sale, 'id' | 'uid' | 'reference' | 'confirmed_at'>
  user?: Pick<User, 'id' | 'name'>
  items?: SaleReturnItem[]
}

export interface CreateSaleReturnData {
  reason?: string | null
  refund_method: RefundMethod
  items: { sale_item_id: number; quantity: number; restock?: boolean }[]
}

// ── Inventory ─────────────────────────────────────────────────────────────

export type InventoryStatus = 'draft' | 'confirmed'

export interface InventorySession {
  id: number
  uid: string
  reference: string
  status: InventoryStatus
  notes: string | null
  created_at: string
  confirmed_at: string | null
  items_count?: number
  creator?: Pick<User, 'id' | 'name'>
  confirmer?: Pick<User, 'id' | 'name'>
}

export interface InventoryLine {
  product_id: number
  product_uid: string
  variant_id: number | null
  name: string
  sku: string
  variant_summary: string | null
  category_name: string | null
  unit: string | null
  expected_qty: number
  counted_qty: number | null
  item_id: number | null
}

// ── API error ─────────────────────────────────────────────────────────────

export interface ApiError {
  message: string
  code?: string
  errors?: Record<string, string[]>
}
