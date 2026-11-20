import { describe, it, expect } from 'vitest'
import { moverDestaque, abreBuscaPeloTeclado } from './cadastroRapido'

describe('cadastro rápido', () => {
  it('setas navegam em círculo', () => {
    expect(moverDestaque(0, 'ArrowDown', 3)).toBe(1)
    expect(moverDestaque(2, 'ArrowDown', 3)).toBe(0)
    expect(moverDestaque(0, 'ArrowUp', 3)).toBe(2)
  })
  it('Enter abre a busca só fora de campos e com a janela fechada', () => {
    expect(abreBuscaPeloTeclado('Enter', 'DIV', false)).toBe(true)
    expect(abreBuscaPeloTeclado('Insert', 'BODY', false)).toBe(true)
    expect(abreBuscaPeloTeclado('Enter', 'INPUT', false)).toBe(false)
    expect(abreBuscaPeloTeclado('Enter', 'DIV', true)).toBe(false)
  })
})
