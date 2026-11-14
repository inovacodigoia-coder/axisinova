import { describe, it, expect } from 'vitest'
import { formatBirthBR } from '@/lib/attendanceDocHeader'
import { calculateAge } from '@/utils/patient.validators'
describe('data de nascimento sem fuso', () => {
  it('mostra o mesmo dia gravado', () => { expect(formatBirthBR('2011-11-22')).toBe('22/11/2011') })
  it('idade muda só no dia do aniversário', () => {
    const real = Date; const fixed = new real(2026, 10, 21, 22, 0)
    // @ts-ignore
    globalThis.Date = class extends real { constructor(...a: any[]) { super(...(a.length ? a : [fixed.getTime()]) as []) } }
    expect(calculateAge('2011-11-22')).toBe(14)
    globalThis.Date = real
  })
})
