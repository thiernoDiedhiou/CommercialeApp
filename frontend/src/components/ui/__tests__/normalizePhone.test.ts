import { describe, it, expect } from 'vitest'
import { normalizePhone } from '../PhoneInput'

describe('normalizePhone', () => {
  it('retourne null pour undefined', () => {
    expect(normalizePhone(undefined)).toBeNull()
  })

  it('retourne null pour chaîne vide', () => {
    expect(normalizePhone('')).toBeNull()
  })

  it('retourne null quand la valeur est uniquement l\'indicatif (+221)', () => {
    expect(normalizePhone('+221')).toBeNull()
  })

  it('retourne null quand la valeur est uniquement l\'indicatif français (+33)', () => {
    expect(normalizePhone('+33')).toBeNull()
  })

  it('retourne le numéro complet si valide', () => {
    expect(normalizePhone('+221 77 123 45 67')).toBe('+221 77 123 45 67')
  })

  it('retourne le numéro complet pour un numéro français', () => {
    expect(normalizePhone('+33 6 12 34 56 78')).toBe('+33 6 12 34 56 78')
  })

  it('conserve les espaces et tirets dans le numéro', () => {
    const phone = '+224 622-000-000'
    expect(normalizePhone(phone)).toBe(phone)
  })

  it('retourne null pour une chaîne avec espaces uniquement', () => {
    expect(normalizePhone('   ')).toBeNull()
  })
})
