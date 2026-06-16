/**
 * Génère un UUID v4.
 * Utilise crypto.randomUUID() si disponible (HTTPS / localhost),
 * sinon retombe sur une implémentation RFC 4122 compatible HTTP et navigateurs anciens.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback RFC 4122 v4 — fonctionne sur HTTP et anciens navigateurs
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
