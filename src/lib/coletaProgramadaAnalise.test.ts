import { describe, expect, it } from 'vitest'
import { coletasAlteradas, exameDisponivelParaAnalise, textoColetaAlterada } from './coletaProgramadaAnalise'

describe('coleta com data alterada na Análise', () => {
  it('mantém na fila o exame com coleta programada para o futuro', () => {
    const exame = {
      collected: true,
      collectedAt: '2026-11-25T17:11:00.000Z',
      coletaProgramada: true,
      status: 'pending',
    }
    expect(exameDisponivelParaAnalise(exame, true)).toBe(true)
  })

  it('continua ocultando coleta cancelada mesmo com data antiga preenchida', () => {
    const exame = {
      collected: false,
      collectedAt: '2026-11-25T17:11:00.000Z',
      coletaProgramada: true,
      status: 'pending',
    }
    expect(exameDisponivelParaAnalise(exame, true)).toBe(false)
  })

  it('continua ocultando exame sem coleta e sem trabalho anterior', () => {
    expect(exameDisponivelParaAnalise({ status: 'pending' }, false)).toBe(false)
  })

  it('agrupa as datas alteradas sem duplicar e na ordem cronológica', () => {
    expect(coletasAlteradas([
      { coletaProgramada: true, collectedAt: '2026-11-26T12:00:00.000Z' },
      { coletaProgramada: true, collectedAt: '2026-11-25T17:11:00.000Z' },
      { coletaProgramada: true, collectedAt: '2026-11-26T12:00:00.000Z' },
      { coletaProgramada: false, collectedAt: '2026-11-24T12:00:00.000Z' },
    ])).toEqual(['2026-11-25T17:11:00.000Z', '2026-11-26T12:00:00.000Z'])
  })

  it('informa que a coleta foi alterada e mostra dia, mês, ano e hora', () => {
    expect(textoColetaAlterada('2026-11-25T17:11:00')).toBe('Coleta alterada: 25/11/2026 17:11')
  })
})
