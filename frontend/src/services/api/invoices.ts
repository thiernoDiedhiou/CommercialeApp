import apiClient from '@/lib/axios'
import type {
  Invoice,
  CreateInvoiceData,
  UpdateInvoiceData,
  PaginatedResponse,
} from '@/types'

function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

// ── Factures ──────────────────────────────────────────────────────────────

export async function getInvoices(params: {
  status?: string
  customer_id?: number
  search?: string
  from?: string
  to?: string
  page?: number
} = {}): Promise<PaginatedResponse<Invoice>> {
  const { data } = await apiClient.get<PaginatedResponse<Invoice>>('/api/v1/invoices', {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function getInvoice(uid: string): Promise<Invoice> {
  const { data } = await apiClient.get<{ data: Invoice }>(`/api/v1/invoices/${uid}`)
  return data.data
}

export async function createInvoice(body: CreateInvoiceData): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>('/api/v1/invoices', body)
  return data.data
}

export async function updateInvoice(uid: string, body: UpdateInvoiceData): Promise<Invoice> {
  const { data } = await apiClient.put<{ data: Invoice }>(`/api/v1/invoices/${uid}`, body)
  return data.data
}

export async function deleteInvoice(uid: string): Promise<void> {
  await apiClient.delete(`/api/v1/invoices/${uid}`)
}

export async function sendInvoice(uid: string): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`/api/v1/invoices/${uid}/send`)
  return data.data
}

export async function recordInvoicePayment(uid: string, amount: number): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`/api/v1/invoices/${uid}/payment`, {
    amount,
  })
  return data.data
}

export async function cancelInvoice(uid: string): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`/api/v1/invoices/${uid}/cancel`)
  return data.data
}

export async function openInvoicePdf(uid: string, reference?: string): Promise<void> {
  const response = await apiClient.get(`/api/v1/invoices/${uid}/pdf`, {
    responseType: 'blob',
  })
  const filename = reference ? `facture-${reference}.pdf` : `facture-${uid}.pdf`

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
