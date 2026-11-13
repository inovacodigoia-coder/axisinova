import { describe, it, expect } from 'vitest'
import { buscarEmBlocos, emPedacos } from './buscarEmBlocos'

/** Simula o servidor: devolve no máximo 1.000 linhas por pedido. */
function servidor(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }))
  const pedidos: Array<[number, number]> = []
  const bloco = (de: number, ate: number) => {
    pedidos.push([de, ate])
    return Promise.resolve({ data: rows.slice(de, Math.min(ate + 1, de + 1000)), error: null })
  }
  return { bloco, pedidos }
}

describe('busca em blocos de 1.000', () => {
  it('menos de 1.000 linhas: um pedido só', async () => {
    const s = servidor(752)
    const r = await buscarEmBlocos(s.bloco)
    expect(r.linhas).toHaveLength(752)
    expect(r.limitado).toBe(false)
    expect(s.pedidos).toEqual([[0, 999]])
  })

  it('4.102 linhas: busca até acabar, nenhuma fica de fora', async () => {
    const s = servidor(4102)
    const r = await buscarEmBlocos(s.bloco)
    expect(r.linhas).toHaveLength(4102)
    expect(r.linhas[4101]).toEqual({ id: 4101 })
    expect(r.limitado).toBe(false)
    expect(s.pedidos).toHaveLength(5)
  })

  it('exatamente 1.000 linhas: confere o bloco seguinte e não marca limite', async () => {
    const s = servidor(1000)
    const r = await buscarEmBlocos(s.bloco)
    expect(r.linhas).toHaveLength(1000)
    expect(r.limitado).toBe(false)
  })

  it('acima do teto: avisa que ficou limitado em vez de cortar em silêncio', async () => {
    const s = servidor(3500)
    const r = await buscarEmBlocos(s.bloco, { teto: 3000 })
    expect(r.linhas).toHaveLength(3000)
    expect(r.limitado).toBe(true)
  })

  it('no teto exato sem mais registros: não avisa', async () => {
    const s = servidor(3000)
    const r = await buscarEmBlocos(s.bloco, { teto: 3000 })
    expect(r.linhas).toHaveLength(3000)
    expect(r.limitado).toBe(false)
  })

  it('remove repetidos entre blocos pela chave', async () => {
    const lotes = [[{ id: 'a' }, { id: 'b' }], [{ id: 'b' }]]
    let i = 0
    const r = await buscarEmBlocos((_de, _ate) => Promise.resolve({ data: lotes[i++] ?? [], error: null }), { tamanho: 2, chave: (x) => x.id })
    expect(r.linhas.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('erro do servidor é repassado, nunca vira lista vazia', async () => {
    await expect(buscarEmBlocos(() => Promise.resolve({ data: null, error: new Error('falhou') }))).rejects.toThrow('falhou')
  })

  it('divide ids em pedaços', () => {
    expect(emPedacos([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
})
