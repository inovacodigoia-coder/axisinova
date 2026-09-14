import { describe, expect, it } from 'vitest'
import { evaluateFormula } from './examParameters'

describe('evaluateFormula', () => {
  it('calcula a bilirrubina indireta com códigos de exames externos', () => {
    const values: Record<string, string> = { BILT: '1,8', BILD: '0,6' }
    const result = evaluateFormula(
      '{BILT} - {BILD}',
      [{ id: '1', name: 'Resultado', unit: '', reference: '', isCalculated: true }],
      () => '',
      token => values[token.trim().toUpperCase()] || null,
    )

    expect(result).toBe('1,2')
  })

  it('não calcula quando um exame obrigatório ainda não tem valor', () => {
    const result = evaluateFormula('{BILT} - {BILD}', [], () => '', token => token === 'BILT' ? '1,8' : null)
    expect(result).toBe('')
  })
})