import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SorotecaGrid } from './SorotecaGrid'
import { EstanteGrid } from './EstanteGrid'
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

  it('estante: círculo com o código da posição, cor do status e a última posição destacada', () => {
    render(<EstanteGrid grade={{ id: 'p1', nome: '', linhas: 2, colunas: 4 }} amostras={[amostra({ linha: 1, coluna: 2, status_resultado: 'liberado' })]} atual={{ linha: 1, coluna: 2 }} />)
    expect(screen.getAllByRole('gridcell')).toHaveLength(8)
    const cheia = screen.getByRole('gridcell', { name: 'A02: Maria Teste, amostra 1-01-1-15, Liberado (última preenchida)' })
    expect(cheia).toHaveTextContent('A02')
    expect(screen.getByRole('gridcell', { name: 'B04: livre' })).toHaveTextContent('B04')
  })

  it('estante: clicar num tubo seleciona sem tirar o foco do bipe; posição livre não faz nada', () => {
    const onAmostra = vi.fn()
    render(<EstanteGrid grade={{ id: 'p1', nome: '', linhas: 1, colunas: 3 }} amostras={[amostra({ id: 'a1', linha: 1, coluna: 1 })]} selecionada="a1" onAmostra={onAmostra} />)
    const tubo = screen.getByRole('gridcell', { name: /^A01: Maria Teste.*\(selecionado\)$/ })
    expect(tubo).toHaveAttribute('aria-pressed', 'true')
    expect(fireEvent.mouseDown(tubo)).toBe(false) // padrão cancelado: o foco fica no campo de bipe
    fireEvent.click(tubo)
    expect(onAmostra).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }))
    const livre = screen.getByRole('gridcell', { name: 'A02: livre' })
    expect(livre).toBeDisabled()
    fireEvent.click(livre)
    expect(onAmostra).toHaveBeenCalledTimes(1)
  })
})
