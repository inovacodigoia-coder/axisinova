import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { protegerTextoCsv, montarCsv } from './csvSeguro'
import { csvFinanceiro } from './financeiro'

const PERIGOSOS = ['=1+1', '+cmd', '-2+3', '@SUM(A1)', '\t=1']

describe('proteção contra fórmulas em CSV', () => {
  it.each(PERIGOSOS)('texto perigoso %j sai como texto literal', v => {
    expect(protegerTextoCsv(v)).toBe(`'${v}`)
  })
  it('retorno de carro inicial também é protegido', () => {
    expect(protegerTextoCsv('\r=1')).toBe("'\r=1")
  })
  it('números, negativos e datas ficam intactos', () => {
    expect(protegerTextoCsv(-5.3)).toBe('-5.3')
    expect(protegerTextoCsv('-5,3')).toBe('-5,3')
    expect(protegerTextoCsv('+12')).toBe('+12')
    expect(protegerTextoCsv('-12%')).toBe('-12%')
    expect(protegerTextoCsv('-R$ 10,00')).toBe('-R$ 10,00')
    expect(protegerTextoCsv('19/11/2026 10:30')).toBe('19/11/2026 10:30')
    expect(protegerTextoCsv('2026-11-19')).toBe('2026-11-19')
    expect(protegerTextoCsv(0)).toBe('0')
  })
  it('nome e observação perigosos saem com aspa simples no arquivo; número negativo não', () => {
    const csv = montarCsv([['nome', 'observacao', 'valor'], ['=1+1', '@SUM(A1)', -5.3], ['+cmd', '\t=1', 7]])
    const linhas = csv.replace('\uFEFF', '').split('\r\n')
    expect(linhas[1]).toBe("'=1+1;'@SUM(A1);-5.3")
    expect(linhas[2]).toBe(`'+cmd;"'\t=1";7`)
  })
  it('Financeiro/Caixa usam a mesma proteção e não alteram diferença negativa', () => {
    const csv = csvFinanceiro([{ descricao: '-2+3', diferenca: -5 }])
    expect(csv).toContain(`"'-2+3";"-5"`)
  })
  it('xlsx continua gravando texto como texto (sem fórmula)', () => {
    const ws = XLSX.utils.aoa_to_sheet([PERIGOSOS])
    for (const ref of ['A1', 'B1', 'C1', 'D1', 'E1']) {
      expect(ws[ref].t).toBe('s')
      expect(ws[ref].f).toBeUndefined()
    }
    const ws2 = XLSX.utils.json_to_sheet([{ Paciente: '=1+1' }])
    expect(ws2.A2.t).toBe('s'); expect(ws2.A2.f).toBeUndefined()
  })
})
