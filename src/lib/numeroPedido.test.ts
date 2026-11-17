import { describe, expect, it } from 'vitest'
import { numeroPedidoRepetido } from './numeroPedido'

describe('numeroPedidoRepetido', () => {
  it('reconhece a trava de número repetido do banco', () => {
    expect(numeroPedidoRepetido({ code: '23505', hint: 'numero_pedido_repetido', message: 'O número de pedido 3-01 já existe nesta empresa' })).toBe(true)
  })
  it('não confunde com outros erros', () => {
    expect(numeroPedidoRepetido({ code: '42501', message: 'permission denied' })).toBe(false)
    expect(numeroPedidoRepetido(null)).toBe(false)
  })
})
