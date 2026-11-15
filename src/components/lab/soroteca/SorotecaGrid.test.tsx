import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SorotecaGrid } from './SorotecaGrid'
import type { AmostraSoroteca } from '@/lib/soroteca'

const amostra = (over: Partial<AmostraSoroteca>): AmostraSoroteca => ({
  id: 'a1', codigo_amostra: '1-01-1-15', codigo_alfanumerico: 'X', order_id: 'o', tubo_indice: 1, protocolo: '1-01', patient_name: 'Maria Teste',
  workbench_id: null, bancada_nome: 'Bioquímica', tubo_nome: null, exames_nomes: [], tem_apoio: false, coletada_em: null,
  validade: '2099-01-01T00:00:00Z', status: 'armazenada', equipamento_id: 'eq', equipamento_nome: 'Geladeira 01', linha: 1, coluna: 3,
  armazenada_em: null, descartada_em: null, total: 2, liberados: 1, status_resultado: 'parcial', ...over,
})

describe('mapa da soroteca', () => {
  it('mostra cada posição e só deixa escolher posição livre ao armazenar', () => {
    const onCelula = vi.fn()
    render(<SorotecaGrid equipamento={{ id: 'eq', nome: 'Geladeira 01', linhas: 2, colunas: 4 }} amostras={[amostra({})]} modo="selecionar" onCelula={onCelula} />)
    expect(screen.getAllByRole('gridcell')).toHaveLength(8)
    const ocupada = screen.getByRole('gridcell', { name: 'A03: amostra 1-01-1-15, Parcial' })
    expect(ocupada).toBeDisabled()
    fireEvent.click(screen.getByRole('gridcell', { name: 'B02: livre' }))
    expect(onCelula).toHaveBeenCalledWith(2, 2, null)
  })
})
