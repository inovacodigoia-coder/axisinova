import { describe, expect, it } from 'vitest'
import { buildExamParams, type ResolvedParam } from './examParameters'
import { differentialReportRows, hematologyReady, resolveDifferential } from './hematologyDifferential'

const names = ['Leucócitos totais', 'Neutrófilos segmentados (%)', 'Neutrófilos bastonetes (%)', 'Linfócitos (%)', 'Monócitos (%)', 'Eosinófilos (%)', 'Basófilos (%)', 'Neutrófilos bastonetes (absoluto)', 'Basófilos (absoluto)', 'MID (%)', 'Granulócitos (%)']
const params: ResolvedParam[] = names.map((name, i) => ({ id: String(i), name, unit: name.includes('%') ? '%' : '/mm³', reference: '', isCalculated: name.includes('absoluto') }))
const received = { '0': '4880', '1': '68', '3': '27,8', '4': '2', '5': '0', '6': '2,2', '8': '107' }

describe('regra única da diferencial', () => {
  it('mantém bastonete vazio, basófilo 2,2/107 e soma 100; campos vazios não bloqueiam', () => {
    const r = resolveDifferential(params, received, received)
    expect(r.values['2']).toBeUndefined()
    expect(r.values['7']).toBeUndefined()
    expect(r.values['6']).toBe('2,2')
    expect(r.values['8']).toBe('107')
    expect(r.total).toBe(100)
    expect(hematologyReady(params, id => r.values[id] || '')).toBe(true)
  })
  it('bastonete digitado NÃO reduz o segmentado do aparelho: soma 105 bloqueia a liberação', () => {
    const r = resolveDifferential(params, { ...received, '2': '5' }, received)
    expect(r.values['1']).toBe('68')
    expect(r.total).toBe(105)
    expect(r.manual).toBe(true)
    expect(r.blockRelease).toBe(true)
  })
  it('diferencial manual completa que fecha 100% libera normalmente', () => {
    const manual = { '0': '4880', '1': '60', '2': '5', '3': '27', '4': '5', '5': '3', '6': '0' }
    const r = resolveDifferential(params, manual, received)
    expect(r.total).toBe(100)
    expect(r.manual).toBe(true)
    expect(r.blockRelease).toBe(false)
  })
  it('soma do aparelho fora de 100 por arredondamento só avisa, sem bloquear', () => {
    const raw = { ...received, '6': '2,1' }
    const r = resolveDifferential(params, raw, raw)
    expect(r.manual).toBe(false)
    expect(r.warning).toBe(true)
    expect(r.blockRelease).toBe(false)
  })
  it('absoluto recebido prevalece e absoluto ausente não é inventado (só a fórmula do parâmetro calcula)', () => {
    const raw = { ...received, '8': '110' }
    expect(resolveDifferential(params, raw, raw).values['8']).toBe('110')
    const r = resolveDifferential(params, { '0': '3070', '2': '0,8' }, {})
    expect(r.values['7']).toBeUndefined()
  })
  it('3 partes não transforma granulócitos/MID em neutrófilos', () => {
    const raw = { '0': '5000', '3': '30', '9': '10', '10': '60' }
    const r = resolveDifferential(params, raw, raw)
    expect(r.values['1']).toBeUndefined()
    expect(r.values['2']).toBeUndefined()
    expect(r.values['4']).toBeUndefined()
    expect(r.total).toBe(100)
    expect(hematologyReady(params, id => r.values[id] || '')).toBe(true)
  })
  it('soma manual menor ou maior que 100 bloqueia a liberação sem corrigir nada', () => {
    expect(resolveDifferential(params, { '1': '60', '3': '30' }, {}).blockRelease).toBe(true)
    const r = resolveDifferential(params, { '1': '80', '3': '30' }, {})
    expect(r.blockRelease).toBe(true)
    expect(r.values['1']).toBe('80')
  })
  it('sem tipo conserva todos; 5 esconde MID/Gran; 3 exibe o bloco de 3 partes', () => {
    expect(differentialReportRows(params)).toEqual(params)
    expect(differentialReportRows(params, '5').map(p => p.id)).not.toContain('9')
    expect(differentialReportRows(params, '3').map(p => p.id)).toEqual(['0','3','9','10'])
  })
  it('catálogo não pode reintroduzir complemento ou índices vermelhos derivados', () => {
    const p = buildExamParams({ name: 'Hemograma', parameters: [
      { id: 'b', name: 'Neutrófilos bastonetes (%)', isCalculated: true, formula: '100 - [Basófilos (%)]' },
      { id: 'v', name: 'VCM', isCalculated: true },
    ] }, 'Hemograma', {})
    // Bastonetes (%) tem o cálculo bloqueado; VCM com CALC ligado e fórmula vazia não calcula (sem conta escondida)
    expect(p.map(x => x.formula)).toEqual(['', ''])
    expect(p.map(x => x.isCalculated)).toEqual([false, true])
  })
  it('não libera um hemograma sem leucócitos nem outro exame incompleto', () => {
    expect(hematologyReady(params, id => id === '3' ? '30' : '')).toBe(false)
    const other = [{ id: 'a', name: 'Glicose', unit: '', reference: '' }, { id: 'b', name: 'Controle', unit: '', reference: '' }]
    expect(hematologyReady(other, id => id === 'a' ? '90' : '')).toBe(false)
  })
  it('aceita CALC vazio somente quando a caneta o marcou como opcional', () => {
    const lipidio = [
      { id: 'ct', name: 'Colesterol total', unit: 'mg/dL', reference: '' },
      { id: 'ldl', name: 'Colesterol LDL', unit: 'mg/dL', reference: '', isCalculated: true },
    ]
    expect(hematologyReady(lipidio, id => id === 'ct' ? '180' : '')).toBe(false)
    expect(hematologyReady(lipidio, id => id === 'ct' ? '180' : '', p => p.id === 'ldl')).toBe(true)
  })
})
describe('absolutos seguem a fórmula do cadastro (pedido 504-00, Serrinha)', () => {
  it('absoluto não é tratado como percentual da diferencial', async () => {
    const { differentialPercent } = await import('./hematologyDifferential')
    expect(differentialPercent({ name: 'Neutrófilos segmentados (%)', unit: '%' })).toBe(true)
    expect(differentialPercent({ name: 'Neutrófilos segmentados (absoluto)', unit: '/mm³' })).toBe(false)
    expect(differentialPercent({ name: 'Linfócitos (absoluto)', unit: '/mm³' })).toBe(false)
  })
  it('leucócitos 8500 e segmentados 58% dão 4930; linfócitos 37% dão 3145', async () => {
    const { evaluateFormula } = await import('./examParameters')
    const ps: ResolvedParam[] = [
      { id: 'l', name: 'Leucócitos totais', unit: '/mm³', reference: '' },
      { id: 's', name: 'Neutrófilos segmentados (%)', unit: '%', reference: '' },
      { id: 'y', name: 'Linfócitos (%)', unit: '%', reference: '' },
    ]
    const v: Record<string, string> = { l: '8500', s: '58', y: '37' }
    expect(evaluateFormula('[Neutrófilos segmentados (%)] / 100 * [Leucócitos totais]', ps, id => v[id])).toBe('4930')
    expect(evaluateFormula('[Linfócitos (%)] / 100 * [Leucócitos totais]', ps, id => v[id])).toBe('3145')
  })
})
