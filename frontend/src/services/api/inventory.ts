import apiClient, { API } from '@/lib/axios'
import type { InventorySession, InventoryLine, PaginatedResponse } from '@/types'

export async function getInventorySessions(params?: { page?: number }): Promise<PaginatedResponse<InventorySession>> {
  const { data } = await apiClient.get(`${API}/stock/inventories`, { params })
  return data
}

export async function createInventorySession(notes?: string): Promise<InventorySession> {
  const { data } = await apiClient.post(`${API}/stock/inventories`, { notes })
  return data.data
}

export async function getInventorySession(uid: string): Promise<InventorySession> {
  const { data } = await apiClient.get(`${API}/stock/inventories/${uid}`)
  return data.data
}

export async function getInventoryLines(
  uid: string,
  params?: { search?: string; category_id?: number },
): Promise<InventoryLine[]> {
  const { data } = await apiClient.get(`${API}/stock/inventories/${uid}/lines`, { params })
  return data.data
}

export async function saveInventoryItem(
  uid: string,
  item: { product_id: number; variant_id: number | null; expected_qty: number; counted_qty: number },
): Promise<void> {
  await apiClient.put(`${API}/stock/inventories/${uid}/items`, item)
}

export async function confirmInventorySession(uid: string): Promise<InventorySession> {
  const { data } = await apiClient.post(`${API}/stock/inventories/${uid}/confirm`)
  return data.data
}

export async function deleteInventorySession(uid: string): Promise<void> {
  await apiClient.delete(`${API}/stock/inventories/${uid}`)
}

export function inventoryExportCsvUrl(uid: string): string {
  return `${API}/stock/inventories/${uid}/export-csv`
}

export function inventoryExportPdfUrl(uid: string): string {
  return `${API}/stock/inventories/${uid}/export-pdf`
}

export async function downloadInventoryCsv(uid: string, reference: string): Promise<void> {
  const res = await apiClient.get(`${API}/stock/inventories/${uid}/export-csv`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `${reference}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export async function downloadInventoryPdf(uid: string, reference: string): Promise<void> {
  const res = await apiClient.get(`${API}/stock/inventories/${uid}/export-pdf`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `${reference}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
