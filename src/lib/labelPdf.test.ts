import { describe, it, expect } from 'vitest'
import { medidasFolha, cssPagina } from './labelPdf'

describe('folha fixa de impressão', () => {
  it('A4 retrato é 210x297 e é o padrão', () => {
    expect(medidasFolha('a4')).toEqual([210, 297])
  })
  it('A5 paisagem inverte para 210x148', () => {
    expect(medidasFolha('a5', 'landscape')).toEqual([210, 148])
  })
  it('@page traz tamanho e orientação literais', () => {
    expect(cssPagina('a5', 'portrait', 8)).toBe('@page { size: A5 portrait; margin: 8mm; }')
  })
})

import { fatiasDaFolha } from './labelPdf'
describe('laudo mais alto que A4', () => {
  it('continua na folha seguinte na largura total, sem encolher', () => {
    // A4 sem margem: 210 x 297 → 1000px de largura cabem 1414px por folha
    expect(fatiasDaFolha(1000, 1414, 210, 297)).toEqual([{ y: 0, h: 1414 }])
    expect(fatiasDaFolha(1000, 3000, 210, 297)).toEqual([{ y: 0, h: 1414 }, { y: 1414, h: 1414 }, { y: 2828, h: 172 }])
  })
  it('sobra pequena (até 3%) fica na mesma folha', () => {
    expect(fatiasDaFolha(1000, 1450, 210, 297)).toEqual([{ y: 0, h: 1450 }])
  })
})
