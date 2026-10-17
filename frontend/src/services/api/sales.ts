import apiClient, { API } from '@/lib/axios'
import type { Sale, Payment, SaleReturn, CreateSaleReturnData, PaginatedResponse } from '@/types'

function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

export async function getSales(params: {
  search?: string
  status?: string
  from?: string
  to?: string
  page?: number
} = {}): Promise<PaginatedResponse<Sale>> {
  const { data } = await apiClient.get<PaginatedResponse<Sale>>(`${API}/sales`, {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function getSale(uid: string): Promise<Sale> {
  const { data } = await apiClient.get<{ data: Sale }>(`${API}/sales/${uid}`)
  return data.data
}

export async function cancelSale(uid: string): Promise<Sale> {
  const { data } = await apiClient.post<{ data: Sale }>(`${API}/sales/${uid}/cancel`)
  return data.data
}

export async function addPayment(
  uid: string,
  body: { method: string; amount: number; reference?: string; paid_at?: string },
): Promise<Payment> {
  const { data } = await apiClient.post<{ data: Payment }>(`${API}/sales/${uid}/payments`, body)
  return data.data
}

export async function openSalePdf(uid: string, reference?: string): Promise<void> {
  const response = await apiClient.get(`${API}/sales/${uid}/pdf`, { responseType: 'blob' })
  const filename = reference ? `recu-${reference}.pdf` : `recu-${uid}.pdf`

  const file = new File([response.data as Blob], filename, { type: 'application/pdf' })
  const url  = URL.createObjectURL(file)

  const a = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  setTimeout(() => window.open(url, '_blank'), 150)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// ── Retours ───────────────────────────────────────────────────────────────

export async function createSaleReturn(
  saleUid: string,
  data: CreateSaleReturnData,
): Promise<SaleReturn> {
  const { data: res } = await apiClient.post<{ data: SaleReturn }>(
    `${API}/sales/${saleUid}/returns`,
    data,
  )
  return res.data
}

export async function getReturns(params: {
  search?: string
  from?: string
  to?: string
  refund_method?: string
  sale_id?: number
  page?: number
} = {}): Promise<PaginatedResponse<SaleReturn>> {
  const { data } = await apiClient.get<PaginatedResponse<SaleReturn>>(`${API}/returns`, {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function getSaleReturn(uid: string): Promise<SaleReturn> {
  const { data } = await apiClient.get<{ data: SaleReturn }>(`${API}/returns/${uid}`)
  return data.data
}
