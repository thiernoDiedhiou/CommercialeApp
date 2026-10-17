import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatDateTime } from '../utils'

describe('formatCurrency', () => {
  it('formate un montant XOF sans décimales', () => {
    const result = formatCurrency(1500, 'XOF')
    expect(result).toContain('1')
    expect(result).toContain('500')
    expect(result).not.toMatch(/\.\d{2}/)
  })

  it('formate un montant EUR avec 2 décimales', () => {
    const result = formatCurrency(1500, 'EUR')
    expect(result).toMatch(/1\s?500[,.]00/)
  })

  it('accepte une chaîne en entrée', () => {
    const result = formatCurrency('2500', 'XOF')
    expect(result).toContain('2')
    expect(result).toContain('500')
  })

  it('formate zéro', () => {
    const result = formatCurrency(0, 'XOF')
    expect(result).toContain('0')
  })

  it('formate un montant GNF sans décimales', () => {
    const result = formatCurrency(10000, 'GNF')
    expect(result).not.toMatch(/\.\d{2}/)
  })

  it('formate un montant USD avec 2 décimales', () => {
    const result = formatCurrency(99.5, 'USD')
    expect(result).toContain('99')
  })
})

describe('formatDate', () => {
  it('retourne "—" pour null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('retourne "—" pour undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('retourne "—" pour chaîne vide', () => {
    expect(formatDate('')).toBe('—')
  })

  it('formate une date ISO en dd/mm/yyyy', () => {
    const result = formatDate('2024-03-15T10:00:00Z')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/03/)
    expect(result).toMatch(/2024/)
  })
})

describe('formatDateTime', () => {
  it('retourne "—" pour null', () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it('inclut l\'heure dans la sortie', () => {
    const result = formatDateTime('2024-03-15T14:30:00Z')
    expect(result).toMatch(/\d{2}/)
    expect(result).toMatch(/2024/)
  })
})
