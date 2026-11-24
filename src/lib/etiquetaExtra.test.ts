import { describe, it, expect } from 'vitest'
import { dadosEtiquetaExtra, dataColetaDoTubo } from './etiquetaExtra'

const agora = new Date('2026-11-24T16:00:00Z')
const base = { patientName: 'MARIA', examNames: ['Sódio', 'Potássio'], collectedAt: '2026-11-20T11:30:00Z' }

describe('etiqueta extra', () => {
  it('desmarcar paciente tira o nome', () => {
    expect(dadosEtiquetaExtra(base, { paciente: false, exame: true, dataColeta: true }, agora).paciente).toBe('')
  })
  it('marcar exame usa o nome completo do exame', () => {
    expect(dadosEtiquetaExtra(base, { paciente: true, exame: true, dataColeta: true }, agora).exames).toEqual(['Sódio', 'Potássio'])
  })
  it('desmarcar exame tira os exames', () => {
    expect(dadosEtiquetaExtra(base, { paciente: true, exame: false, dataColeta: true }, agora).exames).toEqual([])
  })
  it('data da coleta marcada usa a coleta, senão a hora da impressão', () => {
    expect(dadosEtiquetaExtra(base, { paciente: true, exame: true, dataColeta: true }, agora).dataHora).toBe('20/11/26, 08:30')
    expect(dadosEtiquetaExtra(base, { paciente: true, exame: true, dataColeta: false }, agora).dataHora).toBe('24/11/26, 13:00')
  })
  it('data da coleta do tubo é a primeira', () => {
    expect(dataColetaDoTubo([{ collectedAt: '2026-11-21T10:00:00Z' }, { collectedAt: '2026-11-20T10:00:00Z' }, {}])).toBe('2026-11-20T10:00:00.000Z')
  })
})
