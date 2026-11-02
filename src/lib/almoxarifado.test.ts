import { describe, it, expect } from 'vitest'
import { addDemoRequest, createInventoryDemo, decideDemo, quantityAt } from './almoxarifado'
describe('Solicitações e demonstração do almoxarifado', () => {
  it('oferece 5 a 10 materiais recebidos em cada setor', () => {
    const s = createInventoryDemo()
    for (const sector of s.setores) {
      const balances = s.saldos.filter(b => b.setor_id === sector.id && b.quantidade > 0)
      expect(balances.length).toBeGreaterThanOrEqual(5)
      expect(balances.length).toBeLessThanOrEqual(10)
    }
  })
  it('dez medicamentos aprovados aparecem no cadastro e no estoque demonstrativo da farmácia', () => {
    const s = createInventoryDemo()
    expect(s.itens.filter(i => i.categoria === 'medicamento' && i.medicamento_id && quantityAt(s,i.id,'farmacia') === 30)).toHaveLength(10)
  })
  it('aprovação transfere exatamente a quantidade solicitada e não se repete', () => {
    const s = createInventoryDemo(), r = s.solicitacoes.find(r => r.id === 'demo-pending-0')
    if (!r) throw new Error('Fixture ausente')
    const l = r.itens[0], before = quantityAt(s,l.item_id,'almoxarifado')
    const next = decideDemo(s,r.id,true)
    expect(quantityAt(next,l.item_id,'almoxarifado')).toBe(before-3)
    expect(quantityAt(next,l.item_id,`setor:${r.setor_id}`)).toBe(8)
    expect(() => decideDemo(next,r.id,true)).toThrow('não pendente')
  })
  it('recusa exige motivo e não movimenta saldo', () => {
    const s = createInventoryDemo()
    expect(() => decideDemo(s,'demo-pending-0',false)).toThrow('motivo')
    const n = decideDemo(s,'demo-pending-0',false,'Não necessário')
    expect(n.saldos).toEqual(s.saldos)
    expect(n.movimentos).toEqual(s.movimentos)
  })
  it('saldo insuficiente bloqueia toda a transferência', () => {
    const s = createInventoryDemo(), copy = structuredClone(s)
    expect(() => decideDemo(s,'demo-pending-2',true)).toThrow('Saldo insuficiente')
    expect(s).toEqual(copy)
  })
  it('todos os sete setores podem solicitar e quantidade inválida é bloqueada', () => {
    const s = createInventoryDemo()
    for (const sector of s.setores) expect(addDemoRequest(s,sector.id,'setor',[{item_id:s.itens[0].id,quantidade:1}],'').solicitacoes).toHaveLength(22)
    expect(() => addDemoRequest(s,s.setores[0].id,'setor',[{item_id:s.itens[0].id,quantidade:-1}],'')).toThrow('inválido')
  })
})