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

export async function getInvoice(id: number): Promise<Invoice> {
  const { data } = await apiClient.get<{ data: Invoice }>(`/api/v1/invoices/${id}`)
  return data.data
}

export async function createInvoice(body: CreateInvoiceData): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>('/api/v1/invoices', body)
  return data.data
}

export async function updateInvoice(id: number, body: UpdateInvoiceData): Promise<Invoice> {
  const { data } = await apiClient.put<{ data: Invoice }>(`/api/v1/invoices/${id}`, body)
  return data.data
}

export async function deleteInvoice(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/invoices/${id}`)
}

export async function sendInvoice(id: number): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`/api/v1/invoices/${id}/send`)
  return data.data
}

export async function recordInvoicePayment(id: number, amount: number): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`/api/v1/invoices/${id}/payment`, {
    amount,
  })
  return data.data
}

export async function cancelInvoice(id: number): Promise<Invoice> {
  const { data } = await apiClient.post<{ data: Invoice }>(`/api/v1/invoices/${id}/cancel`)
  return data.data
}

/**
 * Ouvre le PDF dans un nouvel onglet ET le télécharge avec le bon nom.
 * On utilise `new File()` pour que Chrome conserve le nom lors de la sauvegarde
 * depuis le viewer PDF intégré.
 */
export async function openInvoicePdf(id: number, reference?: string): Promise<void> {
  const response = await apiClient.get(`/api/v1/invoices/${id}/pdf`, {
    responseType: 'blob',
  })
  const filename = reference ? `facture-${reference}.pdf` : `facture-${id}.pdf`

  // File (pas Blob) → Chrome conserve le name lors du "Enregistrer sous" dans le viewer
  const file = new File([response.data as Blob], filename, { type: 'application/pdf' })
  const url  = URL.createObjectURL(file)

  // 1. Télécharge avec le bon nom de fichier
  const a = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // 2. Ouvre dans un nouvel onglet pour l'aperçu / impression (léger délai anti-blocker)
  setTimeout(() => window.open(url, '_blank'), 150)

  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
