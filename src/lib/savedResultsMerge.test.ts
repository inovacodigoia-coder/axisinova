import { describe, it, expect } from 'vitest'
import { mergeSavedResults } from './savedResultsMerge'

describe('mergeSavedResults', () => {
  it('valor salvo no Salvar Parcial volta mesmo com outro valor já na tela', () => {
    const out = mergeSavedResults({
      current: { 'e1_esterase': 'Ausente' },
      saved: { 'e1_esterase': '+ (1+)' },
      userEdited: new Set(),
    })
    expect(out['e1_esterase']).toBe('+ (1+)')
  })

  it('não substitui o que o usuário alterou manualmente nesta sessão', () => {
    const out = mergeSavedResults({
      current: { 'e1_celulas': 'Raras' },
      saved: { 'e1_celulas': 'Ausente' },
      userEdited: new Set(['e1_celulas']),
    })
    expect(out['e1_celulas']).toBe('Raras')
  })

  it('resultado do aparelho prevalece sobre a digitação da sessão', () => {
    const out = mergeSavedResults({
      current: { 'e1_glic': '90' },
      saved: { 'e1_glic': '95' },
      userEdited: new Set(['e1_glic']),
      priority: new Set(['e1_glic']),
    })
    expect(out['e1_glic']).toBe('95')
  })
})
