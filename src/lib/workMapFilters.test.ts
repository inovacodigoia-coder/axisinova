import { describe, expect, it } from 'vitest'
import { dataLocalSaoPaulo, dentroDoPeriodo } from './workMapFilters'

describe('dataLocalSaoPaulo', () => {
  it('usa o dia de São Paulo, não o dia UTC', () => {
    // 00h30 UTC de 31/10 são 21h30 de 30/10 em São Paulo.
    expect(dataLocalSaoPaulo('2026-10-31T00:30:00Z')).toBe('2026-10-30')
    expect(dataLocalSaoPaulo('2026-10-31T12:00:00Z')).toBe('2026-10-31')
  })

  it('devolve vazio sem data válida', () => {
    expect(dataLocalSaoPaulo(undefined)).toBe('')
    expect(dataLocalSaoPaulo('nada')).toBe('')
  })
})

describe('dentroDoPeriodo', () => {
  it('deixa tudo passar sem filtro', () => {
    expect(dentroDoPeriodo(undefined, '', '')).toBe(true)
    expect(dentroDoPeriodo('2026-10-31T12:00:00Z', '', '')).toBe(true)
  })

  it('aceita as duas pontas do período', () => {
    expect(dentroDoPeriodo('2026-10-31T12:00:00Z', '2026-10-31', '2026-10-31')).toBe(true)
    // 23h00 de 31/10 em São Paulo (02h UTC de 01/11) ainda é 31/10.
    expect(dentroDoPeriodo('2026-11-01T02:00:00Z', '', '2026-10-31')).toBe(true)
  })

  it('exige data do item quando há filtro', () => {
    expect(dentroDoPeriodo('2026-10-31T00:30:00Z', '2026-10-31', '')).toBe(false)
    expect(dentroDoPeriodo(undefined, '2026-10-01', '2026-10-31')).toBe(false)
  })
})
