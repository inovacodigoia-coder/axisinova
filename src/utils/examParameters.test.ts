import { describe, expect, it } from 'vitest'
import { evaluateFormula, pickReference, resolveReference } from './examParameters'

describe('resolveReference', () => {
  it('mostra somente o texto cadastrado quando o valor máximo da referência é uma frase', () => {
    const text = 'Presença maciça de leucócitos impedindo a visualização das demais estruturas'
    const ranges = [{ minValue: '', maxValue: text, minAge: '>50', ageUnit: 'valor', sex: 'Todos' }]
    expect(pickReference(ranges, { gender: 'female' }, '55')).toBe(text)
    expect(resolveReference({ ranges, patient: { gender: 'female' }, reference: '' }, '55')).toBe(text)
  })

  it('preserva o sinal de comparação em limites numéricos', () => {
    expect(pickReference([{ maxValue: '50' }], {})).toBe('< 50')
  })

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

describe('fórmula com "x" como multiplicação (HbA1c → eAG)', () => {
  it('calcula 28.7 x HbA1c - 46.7', async () => {
    const { evaluateFormula } = await import('./examParameters')
    const params: any[] = [
      { id: 'a', name: 'Hemoglobina glicada (HbA1c)', isCalculated: false },
      { id: 'b', name: 'Glicemia média estimada (eAG)', isCalculated: true },
    ]
    const r = evaluateFormula('(28.7 x [Hemoglobina glicada (HbA1c)]) - 46.7', params, (id) => (id === 'a' ? '6,5' : ''))
    expect(r).toBe('139,85')
  })
})

describe('absolutos do leucograma saem como célula inteira', () => {
  it('bastonetes: 3070 × 0,8% = 25 e 5720 × 1,6% = 92', async () => {
    const { evaluateFormula } = await import('./examParameters')
    const params: any[] = [
      { id: 'l', name: 'Leucócitos totais', isCalculated: false },
      { id: 'b', name: 'Neutrófilos bastonetes (%)', isCalculated: false },
      { id: 'a', name: 'Neutrófilos bastonetes (absoluto)', isCalculated: true },
    ]
    // Fórmula padrão agora gravada no cadastro do parâmetro (não mais escondida no código)
    const f = '[Neutrófilos bastonetes (%)] / 100 * [Leucócitos totais]'
    expect(evaluateFormula(f, params, (id) => ({ l: '3070', b: '0,8' } as any)[id] || '')).toBe('25')
    expect(evaluateFormula(f, params, (id) => ({ l: '5720', b: '1,6' } as any)[id] || '')).toBe('92')
  })
  it('segmentados: 3070 × 55% = 1689 (não 1688,5)', async () => {
    const { evaluateFormula } = await import('./examParameters')
    const params: any[] = [
      { id: 'l', name: 'Leucócitos totais' },
      { id: 's', name: 'Neutrófilos segmentados (%)' },
    ]
    const f = '[Neutrófilos segmentados (%)] / 100 * [Leucócitos totais]'
    expect(evaluateFormula(f, params, (id) => ({ l: '3070', s: '55' } as any)[id] || '')).toBe('1689')
  })
  it('CALC ligado sem fórmula não calcula nada (sem conta escondida)', async () => {
    const { evaluateFormula, buildExamParams } = await import('./examParameters')
    expect(evaluateFormula('', [], () => '1')).toBe('')
    const p = buildExamParams({ name: 'Hemograma', parameters: [
      { id: 'v', name: 'VCM', isCalculated: true },
      { id: 'a', name: 'Linfócitos (absoluto)', isCalculated: true, formula: '  ' },
    ] }, 'Hemograma', {})
    expect(p.map(x => x.isCalculated)).toEqual([true, true])
    expect(p.map(x => x.formula)).toEqual(['', ''])
  })
})
