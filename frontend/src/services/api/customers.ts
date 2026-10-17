import apiClient, { API } from '@/lib/axios'
import type {
  Customer,
  CustomerDetail,
  DebtPageResponse,
  DebtDetail,
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
  const { data } = await apiClient.get<PaginatedResponse<Customer>>(`${API}/customers`, {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function getCustomer(uid: string): Promise<CustomerDetail> {
  const { data } = await apiClient.get<{ data: CustomerDetail }>(`${API}/customers/${uid}`)
  return data.data
}

export async function createCustomer(body: CreateCustomerData): Promise<Customer> {
  const { data } = await apiClient.post<{ data: Customer }>(`${API}/customers`, body)
  return data.data
}

export async function updateCustomer(
  uid: string,
  body: Partial<CreateCustomerData>,
): Promise<Customer> {
  const { data } = await apiClient.put<{ data: Customer }>(`${API}/customers/${uid}`, body)
  return data.data
}

export async function deleteCustomer(uid: string): Promise<void> {
  await apiClient.delete(`${API}/customers/${uid}`)
}

export async function getCustomerSales(
  customerUid: string,
  params: { page?: number; per_page?: number } = {},
): Promise<PaginatedResponse<Sale>> {
  const { data } = await apiClient.get<PaginatedResponse<Sale>>(
    `${API}/customers/${customerUid}/sales`,
    { params: clean(params) },
  )
  return data
}

export async function getDebts(params: {
  search?: string
  sort?: string
  page?: number
} = {}): Promise<DebtPageResponse> {
  const { data } = await apiClient.get<DebtPageResponse>(`${API}/debts`, {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function getDebtDetail(customerUid: string): Promise<DebtDetail> {
  const { data } = await apiClient.get<DebtDetail>(`${API}/debts/${customerUid}`)
  return data
}
