import { describe, it, expect } from 'vitest'
import { escolherLaudo, parametrosParaCasar } from '../../supabase/functions/_shared/laudoEscolha'

const laudos = [
  { id: 'l2', code: 'L002', sort_order: 2, is_active: true },
  { id: 'l1', code: 'L001', sort_order: 1, is_active: true },
  { id: 'l3', code: 'L003', sort_order: 3, is_active: false },
]

describe('laudo do resultado do aparelho', () => {
  it('sem laudo_code (servidor antigo) grava no laudo de ordem 1, sem recusar', () => {
    expect(escolherLaudo({ examName: 'Glicose', laudos })).toEqual({ ok: true, laudoId: 'l1', origem: 'ordem1' })
  })

  it('sem laudo_code usa o laudo da bancada do item quando existe', () => {
    expect(escolherLaudo({ examName: 'Glicose', laudos, bancadaLaudoId: 'l2' })).toMatchObject({ ok: true, laudoId: 'l2' })
  })

  it('sem laudo_code mantém o laudo já escolhido no resultado do exame', () => {
    expect(escolherLaudo({ examName: 'Glicose', laudos, resultadoLaudoId: 'l2', bancadaLaudoId: 'l1' })).toMatchObject({ laudoId: 'l2' })
  })

  it('com laudo_code válido grava nesse laudo (maiúsculas/minúsculas tanto faz)', () => {
    expect(escolherLaudo({ laudoCode: 'l002', examName: 'Glicose', laudos, resultadoLaudoId: 'l1' })).toMatchObject({ ok: true, laudoId: 'l2' })
  })

  it('laudo_code de outro exame é recusado com a mensagem do exame', () => {
    const r = escolherLaudo({ laudoCode: 'X9', examName: 'Glicose', laudos })
    expect(r.ok).toBe(false)
    expect('erro' in r ? r.erro : '').toContain('não pertence ao exame "Glicose"')
  })

  it('laudo_code inativo é recusado', () => {
    expect(escolherLaudo({ laudoCode: 'L003', examName: 'Glicose', laudos }).ok).toBe(false)
  })

  it('exame sem nenhum laudo cadastrado aceita sem laudo', () => {
    expect(escolherLaudo({ examName: 'Glicose', laudos: [] })).toEqual({ ok: true, laudoId: null, origem: 'nenhum' })
  })
})

describe('parâmetros procurados para o test_code', () => {
  const exame = [{ id: '1', name: 'Hemácias', equipCode: 'RBC' }]
  const comOculto = [
    { id: 'a', code: 'L001', sort_order: 1, is_active: true, parameters: [{ id: '1', name: 'Hemácias', equipCode: 'RBC' }, { id: '24', name: 'Alerta WBC', equipCode: 'WBCFlag', isHidden: true, type: 'text' }] },
  ]

  it('parâmetro oculto que só existe no laudo também é encontrado, sem repetir os demais', () => {
    const { todos } = parametrosParaCasar(exame, comOculto)
    expect(todos.map((p) => p.equipCode)).toEqual(['RBC', 'WBCFlag'])
  })

  it('com laudo_code, a configuração principal é a do laudo indicado', () => {
    const { principal } = parametrosParaCasar(exame, comOculto, 'L001')
    expect(principal).toHaveLength(2)
  })
})
