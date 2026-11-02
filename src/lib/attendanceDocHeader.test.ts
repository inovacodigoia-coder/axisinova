import { describe, it, expect } from 'vitest'
import { birthWithAge, ageFromBirth } from './attendanceDocHeader'

describe('nascimento no comprovante', () => {
  it('mostra data brasileira e idade real', () => {
    expect(birthWithAge('1979-05-11')).toBe('11/05/1979 (47 anos)'.replace('47', String(ageFromBirth('1979-05-11'))))
    expect(ageFromBirth('1979-05-11', new Date(2026, 10, 2))).toBe(47)
    expect(ageFromBirth('2011-12-19', new Date(2026, 10, 2))).toBe(14)
  })
})
