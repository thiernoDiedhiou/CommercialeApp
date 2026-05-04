import { create } from 'zustand'

// Valeurs RGB par défaut (blue-600 / violet-700) — format "R G B" pour Tailwind
const DEFAULT_PRIMARY   = '37 99 235'
const DEFAULT_SECONDARY = '109 40 217'

function hexToRgbComponents(hex: string): string | null {
  const clean = hex.replace('#', '')
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return null
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

interface TenantStoreState {
  applyBrandColors: (primary: string | null, secondary: string | null) => void
}

export const useTenantStore = create<TenantStoreState>()(() => ({
  /**
   * Convertit les hex du tenant en composantes RGB et les injecte dans les
   * CSS variables --brand-primary / --brand-secondary utilisées par Tailwind.
   * À appeler après login et au montage du Layout.
   */
  applyBrandColors: (primary, secondary) => {
    const pRgb = (primary   && hexToRgbComponents(primary))   || DEFAULT_PRIMARY
    const sRgb = (secondary && hexToRgbComponents(secondary)) || DEFAULT_SECONDARY

    document.documentElement.style.setProperty('--brand-primary',   pRgb)
    document.documentElement.style.setProperty('--brand-secondary', sRgb)
  },
}))
