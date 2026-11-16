import { describe, it, expect } from 'vitest'
import { mudadosPeloAparelho } from './aparelhoMudouNaTela'

const g = (over: Partial<{ key: string; nome: string; source: string | null; value: string | null; instrument_value: string | null }> = {}) => ({
  key: 'e1_p1', nome: 'Glicose', source: 'instrument', value: '98', instrument_value: '98', ...over,
})

describe('mudadosPeloAparelho — resultado novo do aparelho com a tela aberta', () => {
  it('aparelho mandou valor novo depois que a tela abriu → bloqueia', () => {
    expect(mudadosPeloAparelho({ e1_p1: '98' }, [g({ value: '105', instrument_value: '105' })])).toEqual(['Glicose'])
  })

  it('aparelho mandou o 1º valor depois que a tela abriu → bloqueia', () => {
    expect(mudadosPeloAparelho({}, [g()])).toEqual(['Glicose'])
  })

  it('nada mudou no banco → libera', () => {
    expect(mudadosPeloAparelho({ e1_p1: '98' }, [g()])).toEqual([])
  })

  it('técnico corrigiu à mão (valor ≠ aparelho) sem resultado novo → libera', () => {
    expect(mudadosPeloAparelho({ e1_p1: '98' }, [g({ value: '99', instrument_value: '98' })])).toEqual([])
  })

  it('valor digitado à mão no banco não conta como aparelho', () => {
    expect(mudadosPeloAparelho({}, [g({ source: 'manual', instrument_value: null })])).toEqual([])
  })

  it('cada parâmetro do painel conta sozinho', () => {
    const r = mudadosPeloAparelho(
      { e1_p1: '98', e1_p2: '4.5' },
      [g(), g({ key: 'e1_p2', nome: 'Leucócitos', value: '5.1', instrument_value: '5.1' })],
    )
    expect(r).toEqual(['Leucócitos'])
  })
})
