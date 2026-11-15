import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EquipamentoDesenho, LocalDaEstanteDesenho } from './EquipamentoDesenho'
import { desenhoDoArmario, type EquipamentoSoroteca } from '@/lib/soroteca'

const base = (over: Partial<EquipamentoSoroteca>): EquipamentoSoroteca => ({
  id: 'x', nome: 'X', tipo: 'geladeira', temperatura: null, workbench_id: null, bancada_nome: null, ativo: true,
  ocupadas: 0, capacidade: 0, prateleiras: [], ...over,
})
const prat = (id: string, ordem: number, vagas: number) => ({ id, nome: `Prateleira ${ordem}`, linhas: 1, colunas: vagas, ordem, ocupadas: 0 })
const estante = (id: string, codigo: string, prateleira: string | null, over: Partial<EquipamentoSoroteca> = {}) => base({
  id, nome: `Estante ${codigo}`, tipo: 'estante', codigo, ocupadas: 2, capacidade: 64,
  situacao: prateleira ? 'armazenada' : 'em_preenchimento', local_equipamento_id: prateleira ? 'g1' : null,
  local_equipamento_nome: prateleira ? 'Geladeira 01' : null, local_prateleira_id: prateleira, local_prateleira_nome: prateleira ? 'Prateleira 2' : null,
  prateleiras: [{ id: `${id}-g`, nome: '', linhas: 4, colunas: 16, ordem: 1, ocupadas: 2 }], ...over,
})

// Geladeira com 3 prateleiras (fora de ordem no cadastro): 2 vagas na de cima, 1 na do meio, 3 na de baixo.
const geladeira = base({ id: 'g1', nome: 'Geladeira 01', temperatura: '2-8°C', prateleiras: [prat('p3', 3, 3), prat('p1', 1, 2), prat('p2', 2, 1)] })
const e1 = estante('e1', 'E00001', 'p2')
const e2 = estante('e2', 'E00002', 'p1')
const solta = estante('e3', 'E00003', null)
const equipamentos = [geladeira, e1, e2, solta]
const renderiza = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>)

describe('desenho do equipamento (regra)', () => {
  it('segue o cadastro: prateleiras de cima para baixo, numeradas, uma vaga por estante que cabe', () => {
    const ps = desenhoDoArmario(geladeira, equipamentos)
    expect(ps.map(p => [p.id, p.numero, p.vagas.length])).toEqual([['p1', 1, 2], ['p2', 2, 1], ['p3', 3, 3]])
    expect(ps[0].vagas.map(v => v?.codigo ?? null)).toEqual(['E00002', null])
  })

  it('prateleira sem vaga fica cheia; a própria estante não conta no Finalizar', () => {
    expect(desenhoDoArmario(geladeira, equipamentos).find(p => p.id === 'p2')!.cheia).toBe(true)
    expect(desenhoDoArmario(geladeira, equipamentos, 'e1').find(p => p.id === 'p2')!.cheia).toBe(false)
  })

  it('estante em preenchimento não ocupa vaga', () => {
    expect(desenhoDoArmario(geladeira, equipamentos).flatMap(p => p.estantes).map(e => e.id)).not.toContain('e3')
  })
})

describe('desenho do equipamento (tela)', () => {
  it('destaca a vaga desta estante e clicar noutra estante abre ela', () => {
    const onEstante = vi.fn()
    renderiza(<LocalDaEstanteDesenho estante={e1} equipamentos={equipamentos} onEstante={onEstante} />)
    expect(screen.getByText('Geladeira 01 > Prateleira 2')).toBeInTheDocument()
    expect(screen.getByText(/Temperatura: 2-8°C/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir estante E00002 · 2/64 tubos' }))
    expect(onEstante).toHaveBeenCalledWith('e2')
  })

  it('estante em preenchimento mostra o aviso no lugar do desenho', () => {
    renderiza(<LocalDaEstanteDesenho estante={solta} equipamentos={equipamentos} />)
    expect(screen.getByText('Fora da geladeira — em preenchimento')).toBeInTheDocument()
    expect(screen.queryByRole('figure')).toBeNull()
  })

  it('no Finalizar a prateleira é escolhida pelo clique e a cheia fica bloqueada', () => {
    const onPrateleira = vi.fn()
    renderiza(<EquipamentoDesenho armario={geladeira} equipamentos={equipamentos} ignorarEstanteId="e3" onPrateleira={onPrateleira} />)
    const cheia = screen.getByRole('button', { name: /^Prateleira 2 — 1\/1 estantes \(cheia\)/ })
    expect(cheia).toBeDisabled()
    fireEvent.click(cheia)
    fireEvent.click(screen.getByRole('button', { name: /^Prateleira 3 — 0\/3 estantes/ }))
    expect(onPrateleira).toHaveBeenCalledTimes(1)
    expect(onPrateleira).toHaveBeenCalledWith('p3')
  })
})
