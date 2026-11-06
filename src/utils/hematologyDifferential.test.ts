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
    expect(r.values['7']).toBe('')
    expect(r.values['6']).toBe('2,2')
    expect(r.values['8']).toBe('107')
    expect(r.total).toBe(100)
    expect(hematologyReady(params, id => r.values[id] || '')).toBe(true)
  })
  it('bastonete manual 5 reduz segmentados de 68 para 63 e soma 100', () => {
    const r = resolveDifferential(params, { ...received, '2': '5' }, received)
    expect(r.values['1']).toBe('63')
    expect(r.values['7']).toBe('244')
    expect(r.total).toBe(100)
    expect(resolveDifferential(params, { ...r.values, '2': '6' }, received).values['1']).toBe('62')
  })
  it('absoluto recebido prevalece mesmo quando difere do calculado', () => {
    const raw = { ...received, '8': '110' }
    expect(resolveDifferential(params, raw, raw).values['8']).toBe('110')
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
  it('soma manual menor ou maior que 100 avisa sem corrigir', () => {
    expect(resolveDifferential(params, { '1': '60', '3': '30' }, {}).warning).toBe(true)
    const r = resolveDifferential(params, { '1': '80', '3': '30' }, {})
    expect(r.warning).toBe(true)
    expect(r.values['1']).toBe('80')
  })
  it('arredonda absolutos ausentes: 3070 x 0,8 = 25 e 5720 x 1,6 = 92', () => {
    expect(resolveDifferential(params, { '0': '3070', '2': '0,8' }, {}).values['7']).toBe('25')
    expect(resolveDifferential(params, { '0': '5.720', '2': '1,6' }, {}).values['7']).toBe('92')
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
    expect(p.map(x => x.formula)).toEqual(['', ''])
    expect(p.map(x => x.isCalculated)).toEqual([false,false])
  })
})