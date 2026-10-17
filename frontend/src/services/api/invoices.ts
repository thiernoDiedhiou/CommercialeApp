import apiClient, { API } from '@/lib/axios'
import type {
  Invoice,
  InvoicePayment,
  CreateInvoiceData,
  UpdateInvoiceData,
  PaginatedResponse,
  PaymentMethod,
} from '@/types'

function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

// ── Factures ──────────────────────────────────────────────────────────────

export async function getInvoices(params: {
  type?: string
  status?: string
  customer_id?: number
  search?: string
  from?: string
  to?: string
  page?: number
} = {}): Promise<PaginatedResponse<Invoice>> {
  const { data } = await apiClient.get<PaginatedResponse<Invoice>>(`${API}/invoices`, {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function getInvoice(uid: string): Promise<Invoice> {
  const { data } = await apiClient.get<{ data: Invoice }>(`${API}/invoices/${uid}`)
  return data.data
}

export async function createInvoice(body: CreateInvoiceData): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`${API}/invoices`, body)
  return data.data
}

export async function updateInvoice(uid: string, body: UpdateInvoiceData): Promise<Invoice> {
  const { data } = await apiClient.put<{ data: Invoice }>(`${API}/invoices/${uid}`, body)
  return data.data
}

export async function deleteInvoice(uid: string): Promise<void> {
  await apiClient.delete(`${API}/invoices/${uid}`)
}

export async function sendInvoice(uid: string, body?: { email?: string; subject?: string; message?: string }): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`${API}/invoices/${uid}/send`, body ?? {})
  return data.data
}

export async function recordInvoicePayment(uid: string, body: {
  amount: number
  method?: PaymentMethod
  paid_at?: string
  reference?: string
  note?: string
}): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`${API}/invoices/${uid}/payment`, body)
  return data.data
}

export async function getInvoicePayments(uid: string): Promise<InvoicePayment[]> {
  const { data } = await apiClient.get<{ data: InvoicePayment[] }>(`${API}/invoices/${uid}/payments`)
  return data.data
}

export async function duplicateInvoice(uid: string): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`${API}/invoices/${uid}/duplicate`)
  return data.data
}

export async function convertQuoteToInvoice(uid: string): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`${API}/invoices/${uid}/convert-to-invoice`)
  return data.data
}

export async function createCreditNote(uid: string): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`${API}/invoices/${uid}/credit-note`)
  return data.data
}

export async function sendInvoiceReminder(uid: string): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`${API}/invoices/${uid}/send-reminder`)
  return data.data
}

export async function cancelInvoice(uid: string): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`${API}/invoices/${uid}/cancel`)
  return data.data
}

export async function openInvoicePdf(uid: string, reference?: string): Promise<void> {
  const response = await apiClient.get(`${API}/invoices/${uid}/pdf`, {
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
