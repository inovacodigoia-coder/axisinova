import { describe, expect, it } from 'vitest'
import type { ResolvedParam } from './examParameters'
import { ajusteDiferencial3Partes } from './ajusteDiferencial3Partes'

const names = ['Leucócitos totais', 'Neutrófilos segmentados (%)', 'Linfócitos (%)', 'Monócitos (%)', 'Eosinófilos (%)', 'Basófilos (%)']
const params: ResolvedParam[] = names.map((name, i) => ({ id: String(i), name, unit: i ? '%' : '/mm³', reference: '', isCalculated: false }))
const cfg = { limiteLeucocitos: 9000, limiteMid: 15 }

describe('diferencial estimada 3 partes', () => {
  it('7.600, Linf 28,8 / MID 8,4 / Gran 62,8 → 29/63/7/1/0', () => {
    const r = ajusteDiferencial3Partes(params, { '0': '7600', '2': '28,8' }, { midPct: '8,4', granPct: '62,8' }, cfg)
    expect(r).toEqual({ status: 'aplicado', valores: { '2': '29', '1': '63', '3': '7', '4': '1', '5': '0' } })
  })
  it('11.100 (≥ limite): não preenche', () => {
    expect(ajusteDiferencial3Partes(params, { '0': '11100', '2': '28,8' }, { midPct: '8,4', granPct: '62,8' }, cfg)).toBeNull()
  })
  it('MID 16%: não aplica e avisa', () => {
    expect(ajusteDiferencial3Partes(params, { '0': '7600', '2': '24' }, { midPct: '16', granPct: '60' }, cfg)).toEqual({ status: 'mid_alto' })
  })
  it('MID ≤ 1: Monócitos 0, Eos 1 tirado do maior grupo', () => {
    const r: any = ajusteDiferencial3Partes(params, { '0': '7000', '2': '30' }, { midPct: '1', granPct: '69' }, cfg)
    expect(r.valores).toEqual({ '2': '30', '1': '69', '3': '0', '4': '1', '5': '0' })
  })
  it('sem MID/Gran do aparelho: não aplica', () => {
    expect(ajusteDiferencial3Partes(params, { '0': '7600', '2': '28,8' }, {}, cfg)).toBeNull()
  })
})
