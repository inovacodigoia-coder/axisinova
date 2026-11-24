import { describe, it, expect } from 'vitest'
import { aplicarColetaPrevisao, coletaProgramadaDasGuias, formatarPrevisao } from './previsaoColeta'

const agora = new Date('2026-11-24T12:00:00Z').getTime()
const exams = [
  { name: 'Hemograma', expectedDeliveryDate: '2026-11-25T16:00:00.000Z' },
  { name: 'Creatinina', expectedDeliveryDate: '2026-11-26T16:00:00.000Z' },
]
const base = { coletaAntes: '2026-11-24T12:00:00.000Z', coleta: '2026-11-27T12:00:00.000Z', previsao: '2026-11-28T16:00:00.000Z', agora }

describe('coleta/previsão no cadastro', () => {
  it('marcar para todos aplica a coleta futura e desloca a previsão dos demais', () => {
    const r = aplicarColetaPrevisao(exams, 0, { ...base, todos: true })
    expect(r[0].collectedAt).toBe(base.coleta)
    expect(r[0].expectedDeliveryDate).toBe(base.previsao)
    expect(r[1].collectedAt).toBe(base.coleta)
    expect(r[1].coletaProgramada).toBe(true)
    expect(r[1].expectedDeliveryDate).toBe('2026-11-29T16:00:00.000Z')
  })
  it('sem "todos" só o exame escolhido muda', () => {
    const r = aplicarColetaPrevisao(exams, 0, { ...base, todos: false })
    expect(r[1]).toEqual(exams[1])
  })
  it('pedido recebe a maior coleta futura', () => {
    const r = aplicarColetaPrevisao(exams, 0, { ...base, todos: true })
    expect(coletaProgramadaDasGuias([{ exams: r }], agora)).toBe('2026-11-27T12:00:00.000Z')
  })
  it('previsão sai em dia/mês/ano', () => {
    expect(formatarPrevisao('2026-11-25T16:16:00')).toBe('25/11/2026 16:16')
  })
})
