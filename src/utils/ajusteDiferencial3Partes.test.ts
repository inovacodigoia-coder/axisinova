import { describe, expect, it } from 'vitest'
import type { ResolvedParam } from './examParameters'
import { ajusteDiferencial3Partes } from './ajusteDiferencial3Partes'

const names = ['Leucócitos', 'Neutrófilos (%)', 'Linfócitos (%)', 'Monócitos (%)', 'Eosinófilos (%)', 'Basófilos (%)']
const params: ResolvedParam[] = names.map((name, i) => ({ id: String(i), name, unit: i ? '%' : '/mm³', reference: '', isCalculated: false }))
const soma = (r: Record<string, string>) => Object.values(r).reduce((s, x) => s + Number(x), 0)

describe('ajuste automático 3 partes', () => {
  it('abaixo de 9.000 leucócitos não ajusta', () => {
    expect(ajusteDiferencial3Partes(params, { '0': '8999', '1': '60', '2': '30', '3': '10', '4': '0', '5': '0' })).toBeNull()
  })
  it('com 9.000: eosinófilo 1, monócito −1, neutrófilo e linfócito mantidos', () => {
    const r = ajusteDiferencial3Partes(params, { '0': '9.000', '1': '60', '2': '30', '3': '10', '4': '0', '5': '0' })!
    expect(r).toEqual({ '1': '60', '2': '30', '3': '9', '4': '1', '5': '0' })
  })
  it('monócito 0 trava em 0 e a falta sai do neutrófilo; soma 100', () => {
    const r = ajusteDiferencial3Partes(params, { '0': '10000', '1': '70', '2': '30', '3': '0', '4': '0', '5': '0' })!
    expect(r['3']).toBe('0'); expect(r['4']).toBe('1'); expect(r['1']).toBe('69'); expect(soma(r)).toBe(100)
  })
  it('números quebrados fecham 100 em inteiros', () => {
    const r = ajusteDiferencial3Partes(params, { '0': '9,5', '1': '62,7', '2': '28,6', '3': '8,7', '4': '0', '5': '0' })!
    expect(soma(r)).toBe(100); expect(r['4']).toBe('1')
  })
  it('aparelho sem monócito/eosinófilo: o resto vira monócito e aplica a regra', () => {
    const r = ajusteDiferencial3Partes(params, { '0': '11300', '1': '60', '2': '30' })!
    expect(r['2']).toBe('30'); expect(r['1']).toBe('60'); expect(r['3']).toBe('9'); expect(r['4']).toBe('1'); expect(soma(r)).toBe(100)
  })
})
