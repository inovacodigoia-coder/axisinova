import { describe, expect, it } from 'vitest'
import { evaluateFormula, resolveReference } from './examParameters'

describe('resolveReference', () => {
  it('usa o texto selecionado para escolher a faixa Valor sem alterar a seleção', () => {
    const param = {
      type: 'selection',
      patient: { gender: 'female', age: 35 },
      reference: '',
      ranges: [
        { textRange: 'Raras', minAge: 0.1, maxAge: 3, ageUnit: 'valor', sex: 'Todos' },
        { textRange: 'Algumas', minAge: 4, maxAge: 10, ageUnit: 'valor', sex: 'Todos' },
        { textRange: 'Numerosas', minAge: 10, maxAge: 1500, ageUnit: 'valor', sex: 'Todos' },
      ],
    }

    const selectedValue = 'Algumas'

    expect(resolveReference(param, selectedValue)).toBe('4 a 10')
    expect(selectedValue).toBe('Algumas')
  })

  it('mantém a escolha numérica por intervalo para parâmetros como Densidade e pH', () => {
    const param = {
      type: 'numerical',
      patient: { gender: 'male', age: 40 },
      reference: '',
      ranges: [
        { textRange: 'Baixa', minAge: 1, maxAge: 1.014, ageUnit: 'valor', sex: 'Todos' },
        { textRange: 'Normal', minAge: 1.015, maxAge: 1.025, ageUnit: 'valor', sex: 'Todos' },
      ],
    }

    expect(resolveReference(param, '1,020')).toBe('Normal')
  })

  it('aceita limites escritos como texto (ex.: <50) quando a unidade é Valor', () => {
    const param = {
      type: 'numerical',
      patient: { gender: 'female', age: 30 },
      reference: '',
      ranges: [
        { description: 'Abaixo de 50', minAge: '<50', maxAge: '', ageUnit: 'valor', sex: 'Todos' },
        { description: 'Entre 50 e 100', minAge: '50', maxAge: '100', ageUnit: 'valor', sex: 'Todos' },
      ],
    }

    expect(resolveReference(param, '30')).toBe('<50')
    expect(resolveReference(param, '80')).toBe('50 a 100')
    expect(resolveReference(param, '200')).toBe('')
  })
})

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
