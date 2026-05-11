import apiClient from '@/lib/axios'
import type {
  Customer,
  CustomerDetail,
  DebtRow,
  PaginatedResponse,
  Sale,
  CreateCustomerData,
} from '@/types'

function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

export async function getCustomers(params: {
  search?: string
  is_active?: boolean
  page?: number
} = {}): Promise<PaginatedResponse<Customer>> {
  const { data } = await apiClient.get<PaginatedResponse<Customer>>('/api/v1/customers', {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

/**
 * GET /api/v1/customers/{id}
 * Retourne le client enrichi avec sales_count, total_purchases, last_purchase_at.
 */
export async function getCustomer(id: number): Promise<CustomerDetail> {
  const { data } = await apiClient.get<{ data: CustomerDetail }>(`/api/v1/customers/${id}`)
  return data.data
}

export async function createCustomer(body: CreateCustomerData): Promise<Customer> {
  const { data } = await apiClient.post<{ data: Customer }>('/api/v1/customers', body)
  return data.data
}

export async function updateCustomer(
  id: number,
  body: Partial<CreateCustomerData>,
): Promise<Customer> {
  const { data } = await apiClient.put<{ data: Customer }>(`/api/v1/customers/${id}`, body)
  return data.data
}

export async function deleteCustomer(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/customers/${id}`)
}

export async function getCustomerSales(
  customerId: number,
  params: { page?: number; per_page?: number } = {},
): Promise<PaginatedResponse<Sale>> {
  const { data } = await apiClient.get<PaginatedResponse<Sale>>(
    `/api/v1/customers/${customerId}/sales`,
    { params: clean(params) },
  )
  return data
}

export async function getDebts(params: {
  search?: string
  page?: number
} = {}): Promise<PaginatedResponse<DebtRow>> {
  const { data } = await apiClient.get<PaginatedResponse<DebtRow>>('/api/v1/debts', {
    params: clean(params as Record<string, unknown>),
  })
  return data
}
