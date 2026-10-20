import { describe, it, expect } from 'vitest'
import { validarCelular, diasDesde, vencido } from './crm'

describe('CRM — telefone do Novo lead (+55 fixo, 11 dígitos)', () => {
  it('aceita DDD + celular com 11 dígitos, inclusive DDD 55', () => {
    expect(validarCelular('(55) 99123-4567')).toBeNull()
    expect(validarCelular('11987654321')).toBeNull()
  })
  it('recusa 10 dígitos e 13 dígitos (não remove nem adiciona 55)', () => {
    expect(validarCelular('1187654321')).not.toBeNull()
    expect(validarCelular('5511987654321')).not.toBeNull()
  })
})

describe('CRM — tempo na etapa e próximo contato', () => {
  const agora = new Date('2026-10-20T12:00:00Z')
  it('conta dias inteiros', () => { expect(diasDesde('2026-10-17T11:00:00Z', agora)).toBe(3) })
  it('próximo contato no passado é vencido', () => {
    expect(vencido('2026-10-20T11:59:00Z', agora)).toBe(true)
    expect(vencido('2026-10-21T00:00:00Z', agora)).toBe(false)
  })
})
