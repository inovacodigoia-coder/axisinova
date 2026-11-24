import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AttendancePrintSelectionModal } from './AttendancePrintSelectionModal'

vi.mock('@/hooks/useDocumentTemplates', () => ({ useDocumentTemplates: () => ({ templates: [], loading: false, error: '' }) }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/hooks/useAttendanceCadastro', () => ({ useAttendanceOrderActions: () => ({ updateOrder: vi.fn() }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/components/print/ServidorImpressaoStatus', () => ({ ServidorImpressaoStatus: () => null }))

afterEach(cleanup)

const order = {
  id: 'ord-1',
  orderNumber: '296-00',
  status: 'collection_done',
  labGuides: [{
    exams: [
      { id: 'e1', name: 'Sódio', material: 'GEL', collected: true },
      { id: 'e2', name: 'Hemograma', material: 'EDTA', collected: true },
    ],
  }],
} as any

const abrir = () => render(<AttendancePrintSelectionModal open onClose={() => {}} onConfirm={() => {}} order={order} />)

it('Etiqueta Extra mostra o total de etiquetas que vai imprimir', () => {
  abrir()
  fireEvent.click(screen.getByText('Etiqueta Extra'))
  const qtd = screen.getByRole('spinbutton', { name: 'Quantidade de etiquetas' })
  // Sem mexer: uma etiqueta por tubo (2 tubos coletados).
  expect(qtd).toHaveValue(2)
  expect(screen.getByText(/Serão impressas 2 etiqueta\(s\) — 2 tubo\(s\) repetidos até 2/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade de etiquetas' }))
  expect(qtd).toHaveValue(3)
  expect(screen.getByText(/Serão impressas 3 etiqueta\(s\) — 2 tubo\(s\) repetidos até 3/)).toBeInTheDocument()
})

it('Etiquetas de Amostra continuam sem campo de quantidade', () => {
  abrir()
  fireEvent.click(screen.getByText('Etiquetas de Amostra'))
  expect(screen.queryByRole('spinbutton', { name: 'Quantidade de etiquetas' })).not.toBeInTheDocument()
})
