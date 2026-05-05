import apiClient from '@/lib/axios'
import type { SalesReport, ProductsReport, StockReport } from '@/types'

export interface ReportParams {
  from?: string
  to?: string
}

// ── CA par période ────────────────────────────────────────────────────────

export async function getSalesReport(params: ReportParams & {
  group_by?: 'day' | 'month'
}): Promise<SalesReport> {
  const { data } = await apiClient.get<SalesReport>('/api/v1/reports/sales', { params })
  return data
}

export async function exportSalesCsv(params: ReportParams & { group_by?: 'day' | 'month' }): Promise<void> {
  const response = await apiClient.get('/api/v1/reports/sales', {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  })
  downloadBlob(response.data, `ventes_${params.from ?? ''}_${params.to ?? ''}.csv`)
}

// ── Top produits ──────────────────────────────────────────────────────────

export async function getProductsReport(params: ReportParams & {
  limit?: number
}): Promise<ProductsReport> {
  const { data } = await apiClient.get<ProductsReport>('/api/v1/reports/products', { params })
  return data
}

export async function exportProductsCsv(params: ReportParams & { limit?: number }): Promise<void> {
  const response = await apiClient.get('/api/v1/reports/products', {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  })
  downloadBlob(response.data, `top_produits_${params.from ?? ''}_${params.to ?? ''}.csv`)
}

// ── Résumé stock ──────────────────────────────────────────────────────────

export async function getStockReport(params: ReportParams): Promise<StockReport> {
  const { data } = await apiClient.get<StockReport>('/api/v1/reports/stock', { params })
  return data
}

export async function exportStockCsv(params: ReportParams): Promise<void> {
  const response = await apiClient.get('/api/v1/reports/stock', {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  })
  downloadBlob(response.data, `stock_${params.from ?? ''}_${params.to ?? ''}.csv`)
}

// ── Helper téléchargement ─────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
