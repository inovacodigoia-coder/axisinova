import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { EventoEstante, RastreioEstante } from '@/lib/soroteca'

const dados: { atual: RastreioEstante | null } = { atual: null }
vi.mock('@/hooks/useSoroteca', () => ({
  useSorotecaEstanteRastreio: () => ({ data: dados.atual, isLoading: false, isFetching: false, error: null }),
  buscarRastreioEstanteCompleto: vi.fn(),
}))
vi.mock('@/components/lab/soroteca/FolhaDescarte', () => ({
  FolhaDescarteDialog: ({ alvo }: { alvo: { descarteId?: string } | null }) => (alvo ? <div>Folha {alvo.descarteId}</div> : null),
  imprimirElemento: vi.fn(),
  useCabecalhoLaboratorio: () => ({ header: { laboratoryName: 'Lab' }, carregando: false }),
}))
vi.mock('@/components/lab/LabReportHeader', () => ({ LabReportHeader: () => null }))

const { EstanteRastreioView } = await import('./EstanteRastreio')

const ev = (over: Partial<EventoEstante>): EventoEstante => ({
  id: Math.random().toString(), tipo: 'tubo_colocado', quando: '2026-11-15T12:00:00Z', usuario_nome: 'Pedro Lima', amostra_id: 'a1', codigo_amostra: '63-00-2-1',
  patient_name: 'Maria Teste', posicao: 'A02', de_posicao: null, outra_estante: null, equipamento_nome: null, prateleira_nome: null,
  motivo: null, observacao: null, tubos: null, destino: null, descarte_id: null, reimpressao: null, recuperado: false, ...over,
})
const estante = { id: 'e1', codigo: 'E00001', nome: 'Estante E00001', linhas: 4, colunas: 16, bancada_nome: 'Bioquímica', ativo: true,
  situacao: 'armazenada' as const, local_equipamento_nome: 'Geladeira 01', local_prateleira_nome: 'Prateleira 2', tubos: 2,
  criada_em: '2026-11-10T12:00:00Z', criada_por: 'Pedro Lima' }

describe('linha do tempo da estante', () => {
  it('mostra o cabeçalho, abre a amostra pelo código e reimprime a folha do descarte', () => {
    dados.atual = { estante, total: 2, usuarios: ['Pedro Lima'], eventos: [
      ev({ tipo: 'descartada', amostra_id: null, codigo_amostra: null, tubos: 2, descarte_id: 'd1', destino: 'reaproveitar' }), ev({}),
    ] }
    const onAmostra = vi.fn()
    render(<EstanteRastreioView estanteId="e1" onAmostra={onAmostra} />)
    expect(screen.getByText('Guardada em Geladeira 01 > Prateleira 2')).toBeInTheDocument()
    expect(screen.getByText('4 × 16')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '63-00-2-1' }))
    expect(onAmostra).toHaveBeenCalledWith('a1')
    fireEvent.click(screen.getByRole('button', { name: 'Folha' }))
    expect(screen.getByText('Folha d1')).toBeInTheDocument()
    expect(screen.queryByText(/Página 1 de/)).toBeNull()
  })

  it('pagina quando passa de 50 eventos', () => {
    dados.atual = { estante, total: 120, usuarios: [], eventos: Array.from({ length: 50 }, () => ev({})) }
    render(<EstanteRastreioView estanteId="e1" onAmostra={() => {}} />)
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  })
})
