import { describe, it, expect } from 'vitest'
import { zplTesteCabeca } from './etiquetaTesteCabeca'
import { estimateContentHeightMm, labelPresets } from '@/types/label-config.types'

describe('teste da cabeça de impressão', () => {
  it('ocupa a etiqueta inteira de 50x30 mm a 203 dpi', () => {
    const zpl = zplTesteCabeca({ widthMm: 50, heightMm: 30 })
    expect(zpl).toContain('^PW400')
    expect(zpl).toContain('^LL240')
    // faixas pretas de ponta a ponta (largura total), em cima e embaixo
    expect(zpl.match(/\^GB400,/g)).toHaveLength(2)
  })

  it('código de barras do teste usa barra de 3 pontos', () => {
    expect(zplTesteCabeca({ widthMm: 50, heightMm: 25 })).toContain('^BY3')
  })
})

describe('etiqueta reforçada', () => {
  it('texto do código maior e ainda cabe em 50x30 mm', () => {
    const p = labelPresets.find((x) => x.name.startsWith('Reforçada'))!
    expect(p.config.fields.sampleCode.size).toBe(10)
    expect(p.config.fields.sampleHash.size).toBe(9.5)
    expect(estimateContentHeightMm(p.config)).toBeLessThanOrEqual(30)
  })
})
