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

  it('calcula INR com abreviação TP, potência e ISI sem colchetes', () => {
    const params = [
      { id: '1', name: 'Tempo de Protrombina (paciente)', code: 'TP', unit: 'segundos', reference: '' },
      { id: '3', name: 'INR (RNI)', unit: '', reference: '', isCalculated: true },
      { id: '4', name: 'TP (controle médio)', code: 'TP', unit: 'segundos', reference: '' },
      { id: '5', name: 'ISI (Índice de Sensibilidade Internacional)', code: 'TP', unit: '', reference: '' },
    ]
    const values: Record<string, string> = { '1': '11', '4': '10', '5': '1' }

    const result = evaluateFormula(
      '([TP (paciente)] / [TP (controle médio)]) ^ ISI',
      params,
      id => values[id] || '',
    )

    expect(result).toBe('1,1')
  })
})