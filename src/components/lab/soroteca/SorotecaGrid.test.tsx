import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SorotecaGrid } from './SorotecaGrid'
import { PrateleiraAbas } from './PrateleiraAbas'
import type { AmostraSoroteca } from '@/lib/soroteca'

const amostra = (over: Partial<AmostraSoroteca>): AmostraSoroteca => ({
  id: 'a1', codigo_amostra: '1-01-1-15', codigo_alfanumerico: 'X', order_id: 'o', tubo_indice: 1, protocolo: '1-01', patient_name: 'Maria Teste',
  workbench_id: null, bancada_nome: 'Bioquímica', tubo_nome: null, exames_nomes: [], tem_apoio: false, coletada_em: null,
  validade: '2099-01-01T00:00:00Z', status: 'armazenada', equipamento_id: 'eq', equipamento_nome: 'Geladeira 01',
  prateleira_id: 'p1', prateleira_nome: 'Prateleira 1', linha: 1, coluna: 3,
  armazenada_em: null, descartada_em: null, total: 2, liberados: 1, status_resultado: 'parcial', ...over,
})

describe('mapa da soroteca', () => {
  it('mostra cada posição e só deixa escolher posição livre ao armazenar', () => {
    const onCelula = vi.fn()
    render(<SorotecaGrid prateleira={{ id: 'p1', nome: 'Prateleira 1', linhas: 2, colunas: 4 }} amostras={[amostra({})]} modo="selecionar" onCelula={onCelula} />)
    expect(screen.getAllByRole('gridcell')).toHaveLength(8)
    const ocupada = screen.getByRole('gridcell', { name: 'A03: amostra 1-01-1-15, Parcial' })
    expect(ocupada).toBeDisabled()
    fireEvent.click(screen.getByRole('gridcell', { name: 'B02: livre' }))
    expect(onCelula).toHaveBeenCalledWith(2, 2, null)
  })

  it('amostra de outra prateleira não aparece nesta grade', () => {
    render(<SorotecaGrid prateleira={{ id: 'p2', nome: 'Prateleira 2', linhas: 1, colunas: 3 }} amostras={[amostra({})]} />)
    expect(screen.getByRole('gridcell', { name: 'A03: livre' })).toBeInTheDocument()
  })

  it('uma aba por prateleira, na ordem cadastrada', () => {
    const onChange = vi.fn()
    render(<PrateleiraAbas valor="p1" onChange={onChange} prateleiras={[
      { id: 'p2', nome: 'Fundo', linhas: 1, colunas: 2, ordem: 2, ocupadas: 0 },
      { id: 'p1', nome: 'Prateleira 1', linhas: 2, colunas: 2, ordem: 1, ocupadas: 1 },
    ]} />)
    expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(['Prateleira 1 · 1/4', 'Fundo · 0/2'])
    fireEvent.click(screen.getByRole('tab', { name: /Fundo/ }))
    expect(onChange).toHaveBeenCalledWith('p2')
  })
})
