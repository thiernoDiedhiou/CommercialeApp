import apiClient from '@/lib/axios'
import type { ImportResult } from '@/types'

/**
 * Importe des produits depuis un fichier CSV.
 * Retourne 200 si tout est OK, 207 Multi-Status si des lignes ont échoué.
 */
export async function importProducts(
  file: File,
  updateExisting: boolean = false,
): Promise<ImportResult> {
  const form = new FormData()
  form.append('file', file)
  if (updateExisting) form.append('update_existing', '1')

  const { data } = await apiClient.post<ImportResult>('/api/v1/products/import', form, {
    validateStatus: (s) => s === 200 || s === 207, // 207 = import partiel avec erreurs
  })
  return data
}

/** Télécharge le fichier CSV modèle pré-rempli avec des exemples. */
export async function downloadImportTemplate(): Promise<void> {
  const response = await apiClient.get('/api/v1/products/import/template', {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(response.data as Blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = 'modele-import-produits.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
