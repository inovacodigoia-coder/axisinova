import { expect, it } from 'vitest'
import { csvFinanceiro } from './financeiro'
it('CSV exporta somente linhas recebidas após filtro e preserva valores', () => {
  const all = [{ descricao:'Exame', conta:'Banco', valor:100 }, { descricao:'Aluguel', conta:'Caixa', valor:500 }]
  const csv = csvFinanceiro(all.filter(x=>x.conta==='Banco'))
  expect(csv).toContain('"Exame";"Banco";"100"')
  expect(csv).not.toContain('Aluguel')
})
it('CSV neutraliza fórmulas e escapa aspas', () => {
  expect(csvFinanceiro([{descricao:'=1+1',valor:100}])).toContain('"\'=1+1"')
  expect(csvFinanceiro([{descricao:'Conta "Teste"',valor:100}])).toContain('Conta ""Teste""')
})