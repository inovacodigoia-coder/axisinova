import { describe, expect, it } from 'vitest'
import { linhasDoValor, semReferencia, valorTextoLongo } from './laudoValorTexto'

describe('valor tipo texto no laudo', () => {
  it('resultados curtos continuam na coluna normal', () => {
    expect(valorTextoLongo('2,68')).toBe(false)
    expect(valorTextoLongo('Negativo')).toBe(false)
    expect(valorTextoLongo('Amarelo citrino')).toBe(false)
    expect(valorTextoLongo('')).toBe(false)
  })

  it('texto longo ou com várias linhas quebra no laudo', () => {
    expect(valorTextoLongo('fdsfsdfsdfsdfsdfhjsdjk hkjh kjhfd kajhsdjk haskj hdjkas')).toBe(true)
    expect(valorTextoLongo('linha 1\nlinha 2')).toBe(true)
  })

  it('conta as linhas do texto para não estourar a folha', () => {
    expect(linhasDoValor('Negativo')).toBe(1)
    expect(linhasDoValor('a'.repeat(130))).toBe(3)
    expect(linhasDoValor('primeira observação longa do exame\nsegunda')).toBe(2)
  })

  it('sem referência o texto usa a largura livre', () => {
    expect(semReferencia('—')).toBe(true)
    expect(semReferencia('')).toBe(true)
    expect(semReferencia('2,2 - 2,9 mmol/L')).toBe(false)
  })
})
