import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ageInUnit, evaluateFormula, pickReference, resolveReference } from './examParameters'

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


// Hemograma da labsaude conforme VRH2020 (Dacie & Lewis, 12ª ed.): adulto por sexo e criança por idade.
describe('faixas do hemograma por idade e sexo (VRH2020)', () => {
  const HB = [{"description": "Adulto Masculino", "sex": "Masculino", "minAge": 13, "maxAge": 150, "ageUnit": "anos", "minValue": "13,0", "maxValue": "17,0"}, {"description": "Adulto Feminino", "sex": "Feminino", "minAge": 13, "maxAge": 150, "ageUnit": "anos", "minValue": "12,0", "maxValue": "15,0"}, {"description": "Recém-nascido (0 a 2 dias)", "sex": "Todos", "minAge": 0, "maxAge": 2, "ageUnit": "dias", "minValue": "14,0", "maxValue": "22,0"}, {"description": "3 a 31 dias", "sex": "Todos", "minAge": 3, "maxAge": 31, "ageUnit": "dias", "minValue": "15,0", "maxValue": "21,0"}, {"description": "1 mês", "sex": "Todos", "minAge": 1, "maxAge": 1, "ageUnit": "meses", "minValue": "11,5", "maxValue": "16,5"}, {"description": "2 meses", "sex": "Todos", "minAge": 2, "maxAge": 2, "ageUnit": "meses", "minValue": "9,4", "maxValue": "13,0"}, {"description": "3 a 6 meses", "sex": "Todos", "minAge": 3, "maxAge": 6, "ageUnit": "meses", "minValue": "11,1", "maxValue": "14,1"}, {"description": "7 meses a 1 ano", "sex": "Todos", "minAge": 7, "maxAge": 23, "ageUnit": "meses", "minValue": "11,1", "maxValue": "14,1"}, {"description": "2 a 5 anos", "sex": "Todos", "minAge": 2, "maxAge": 5, "ageUnit": "anos", "minValue": "11,1", "maxValue": "14,1"}, {"description": "6 a 12 anos", "sex": "Todos", "minAge": 6, "maxAge": 12, "ageUnit": "anos", "minValue": "11,0", "maxValue": "14,0"}]
  const LEUCO = [{"description": "Adulto", "sex": "Todos", "minAge": 13, "maxAge": 150, "ageUnit": "anos", "minValue": "4000", "maxValue": "10000"}, {"description": "Recém-nascido (0 a 2 dias)", "sex": "Todos", "minAge": 0, "maxAge": 2, "ageUnit": "dias", "minValue": "10000", "maxValue": "26000"}, {"description": "3 a 31 dias", "sex": "Todos", "minAge": 3, "maxAge": 31, "ageUnit": "dias", "minValue": "7000", "maxValue": "22000"}, {"description": "1 mês", "sex": "Todos", "minAge": 1, "maxAge": 1, "ageUnit": "meses", "minValue": "5000", "maxValue": "19000"}, {"description": "2 meses", "sex": "Todos", "minAge": 2, "maxAge": 2, "ageUnit": "meses", "minValue": "5000", "maxValue": "15000"}, {"description": "3 a 6 meses", "sex": "Todos", "minAge": 3, "maxAge": 6, "ageUnit": "meses", "minValue": "6000", "maxValue": "18000"}, {"description": "7 meses a 1 ano", "sex": "Todos", "minAge": 7, "maxAge": 23, "ageUnit": "meses", "minValue": "6000", "maxValue": "16000"}, {"description": "2 a 5 anos", "sex": "Todos", "minAge": 2, "maxAge": 5, "ageUnit": "anos", "minValue": "5000", "maxValue": "15000"}, {"description": "6 a 12 anos", "sex": "Todos", "minAge": 6, "maxAge": 12, "ageUnit": "anos", "minValue": "5000", "maxValue": "13000"}]
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 18, 9, 0)) })
  afterEach(() => { vi.useRealTimers() })
  const ref = (faixas: any[], gender: string | undefined, birthDate: string | null, age?: number) =>
    pickReference(faixas, { gender, birthDate, age })

  it('adulto: homem e mulher têm faixas diferentes', () => {
    expect(ref(HB, 'male', '1980-05-10', 46)).toBe('13,0 a 17,0')
    expect(ref(HB, 'female', '1980-05-10', 46)).toBe('12,0 a 15,0')
    expect(ref(LEUCO, 'female', '1980-05-10', 46)).toBe('4000 a 10000')
  })

  it('recém-nascido, 3 dias, 1 mês, 2 meses e 3 a 6 meses usam a idade em dias/meses', () => {
    expect(ref(HB, 'female', '2026-11-17', 0)).toBe('14,0 a 22,0') // 1 dia
    expect(ref(HB, 'female', '2026-11-10', 0)).toBe('15,0 a 21,0') // 8 dias
    expect(ref(HB, 'male', '2026-10-10', 0)).toBe('11,5 a 16,5') // 1 mês
    expect(ref(HB, 'male', '2026-09-15', 0)).toBe('9,4 a 13,0') // 2 meses
    expect(ref(HB, 'male', '2026-06-01', 0)).toBe('11,1 a 14,1') // 5 meses
    expect(ref(LEUCO, 'male', '2026-11-17', 0)).toBe('10000 a 26000')
  })

  it('crianças: 1 ano, 2 a 5 anos e 6 a 12 anos; a partir de 13 anos vale o adulto', () => {
    expect(ref(LEUCO, 'male', '2025-08-01', 1)).toBe('6000 a 16000')
    expect(ref(LEUCO, 'male', '2022-01-01', 4)).toBe('5000 a 15000')
    expect(ref(HB, 'female', '2016-01-01', 10)).toBe('11,0 a 14,0')
    expect(ref(HB, 'female', '2013-11-18', 13)).toBe('12,0 a 15,0')
    expect(ref(HB, 'female', '2013-11-19', 12)).toBe('11,0 a 14,0') // faz 13 amanhã
  })

  it('sem data de nascimento nem idade continua saindo a faixa do adulto', () => {
    expect(ref(HB, 'female', null)).toBe('12,0 a 15,0')
    expect(ref(HB, undefined, null)).toBe('13,0 a 17,0')
  })

  it('idade completa por unidade', () => {
    const hoje = new Date(2026, 10, 18)
    expect(ageInUnit('2026-11-15', 'dias', hoje)).toBe(3)
    expect(ageInUnit('2026-09-19', 'meses', hoje)).toBe(1)
    expect(ageInUnit('2013-11-19', 'anos', hoje)).toBe(12)
    expect(ageInUnit(null, 'anos', hoje)).toBeNull()
  })

  it('cadastros antigos só em anos continuam iguais (0 a 17 x 18 a 150)', () => {
    const antigas = [
      { description: 'Criança', sex: 'Todos', minAge: 0, maxAge: 17, ageUnit: 'anos', minValue: '1', maxValue: '2' },
      { description: 'Adulto', sex: 'Todos', minAge: 18, maxAge: 150, ageUnit: 'anos', minValue: '3', maxValue: '4' },
    ]
    expect(ref(antigas, 'male', '2008-12-01', 17)).toBe('1 a 2') // 17 anos e 11 meses
    expect(ref(antigas, 'male', '2008-11-18', 18)).toBe('3 a 4')
  })
})
