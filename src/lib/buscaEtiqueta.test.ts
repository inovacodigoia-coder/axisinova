import { describe, it, expect } from 'vitest'
import { buildSampleCode, generateSampleHash } from '@/utils/orderHash'
import { indiceDeEtiquetas, pedidosDaEtiqueta, buscaSoNumeros } from './buscaEtiqueta'

const pedido = (id: string, orderNumber: string) => ({
  id, orderNumber, empresaSeq: 1,
  labGuides: [{ exams: [{ id: 'e1', name: 'Hemograma', material: 'Sangue total EDTA' }] }],
})

const pedidos = [pedido('a', '310-01'), pedido('b', '3100-02'), pedido('c', '20261118-310-03')]
const indice = indiceDeEtiquetas(pedidos, 1)
const hashA = generateSampleHash(buildSampleCode('310-01', 1, 1))

describe('busca pelo código alfanumérico da etiqueta', () => {
  it('colar o código do tubo traz só o pedido daquela etiqueta', () => {
    expect([...(pedidosDaEtiqueta(indice, hashA) || [])]).toEqual(['a'])
  })

  it('aceita o código com espaços, quebra de linha e minúsculas', () => {
    expect([...(pedidosDaEtiqueta(indice, `  ${hashA.toLowerCase()}\n`) || [])]).toEqual(['a'])
  })

  it('código da amostra (pedido-tubo-empresa) também encontra só o pedido', () => {
    expect([...(pedidosDaEtiqueta(indice, '3100-02-1-1') || [])]).toEqual(['b'])
  })

  it('texto que não é etiqueta segue para a busca normal', () => {
    expect(pedidosDaEtiqueta(indice, 'Maria')).toBeNull()
  })

  it('texto com letras nunca vira busca só por números', () => {
    expect(buscaSoNumeros('BRS3IWT10')).toBe(false)
    expect(buscaSoNumeros('310-01')).toBe(true)
  })
})
