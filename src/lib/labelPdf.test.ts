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
