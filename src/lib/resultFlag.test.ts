import { describe, it, expect } from 'vitest'
import { flagReference, parseLabNumber, resultFlag } from './resultFlag'

const calcioTouros = {
  referenceMode: 'completa',
  referenceFullText: 'Valores de Referência:\n2,2 - 2,9 mmol/L',
}

describe('sinalização do resultado', () => {
  it('cálcio 2,68 dentro de 2,2 - 2,9 mmol/L é Normal, mesmo com faixas antigas em mg/dL', () => {
    const ref = flagReference(calcioTouros, '8.6 a 10.3')
    expect(resultFlag('2,68', ref)).toBe('Normal')
  })

  it('cálcio digitado com ponto (2.66) não vira 266', () => {
    expect(parseLabNumber('2.66')).toBe(2.66)
    expect(resultFlag('2.66', flagReference(calcioTouros, '8.6 a 10.3'))).toBe('Normal')
  })

  it('fora da faixa impressa continua marcando', () => {
    const ref = flagReference(calcioTouros, '8.6 a 10.3')
    expect(resultFlag('2,1', ref)).toBe('Baixo')
    expect(resultFlag('3,0', ref)).toBe('Alto')
  })

  it('referência completa com tabela (várias faixas) usa a faixa por idade/sexo', () => {
    const p = { referenceMode: 'completa', referenceFullText: 'Até 1 ano: 8,7 a 11\nAdultos: 8,6 a 10,3' }
    expect(flagReference(p, '8.6 a 10.3')).toBe('8.6 a 10.3')
  })

  it('limite único no texto completo: "Valor desejável: < 190 mg/dL"', () => {
    const p = { referenceMode: 'completa', referenceFullText: 'Valor desejável: < 190 mg/dL' }
    expect(resultFlag('212,4', flagReference(p, ''))).toBe('Alto')
    expect(resultFlag('150', flagReference(p, ''))).toBe('Normal')
  })

  it('milhar com ponto continua milhar (7.500 em 4.000 a 10.000)', () => {
    expect(parseLabNumber('7.500')).toBe(7500)
    expect(resultFlag('7.500', '4.000 a 10.000')).toBe('Normal')
    expect(resultFlag('12.000', '4.000 a 10.000')).toBe('Alto')
  })
})
