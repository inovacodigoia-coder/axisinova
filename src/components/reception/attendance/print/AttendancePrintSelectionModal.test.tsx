import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AttendancePrintSelectionModal } from './AttendancePrintSelectionModal'

vi.mock('@/hooks/useDocumentTemplates', () => ({ useDocumentTemplates: () => ({ templates: [], loading: false, error: '' }) }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/hooks/useAttendanceCadastro', () => ({ useAttendanceOrderActions: () => ({ updateOrder: vi.fn() }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/components/print/ServidorImpressaoStatus', () => ({ ServidorImpressaoStatus: () => null }))
const preferencias = vi.hoisted(() => ({ formatos: {} as Record<string, string>, guardar: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/hooks/useFormatoImpressao', () => ({ useFormatoImpressao: () => preferencias }))

afterEach(cleanup)
beforeEach(() => { preferencias.formatos = {}; preferencias.guardar.mockClear() })

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
  // Sem mexer: uma etiqueta só do paciente.
  expect(qtd).toHaveValue(1)
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade de etiquetas' }))
  expect(qtd).toHaveValue(2)
})

it('Etiquetas de Amostra continuam sem campo de quantidade', () => {
  abrir()
  fireEvent.click(screen.getByText('Etiquetas de Amostra'))
  expect(screen.queryByRole('spinbutton', { name: 'Quantidade de etiquetas' })).not.toBeInTheDocument()
})

it('Confirmar imprime a Etiqueta Extra também nos detalhes do atendimento', async () => {
  const onConfirm = vi.fn()
  render(<AttendancePrintSelectionModal open onClose={() => {}} onConfirm={onConfirm} order={order} />)
  fireEvent.click(screen.getByText('Etiqueta Extra'))
  fireEvent.click(screen.getByRole('button', { name: /^CONFIRMAR$/i }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalled())
  expect(onConfirm.mock.calls[0][0]).toMatchObject({ action: 'print', optionId: 'etiqueta_extra', qtdEtiquetas: 1 })
})

it('pós-cadastro mantém as duas etiquetas selecionadas na fila, mesmo com totais iguais', async () => {
  const onConfirm = vi.fn()
  render(<AttendancePrintSelectionModal open multiSelect onClose={() => {}} onConfirm={onConfirm} order={order} />)
  fireEvent.click(screen.getByText('Etiquetas de Amostra'))
  fireEvent.click(screen.getByText('Etiqueta Extra'))
  fireEvent.click(screen.getByRole('button', { name: /^CONFIRMAR$/i }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalled())
  expect(onConfirm.mock.calls[0][0]).toMatchObject({ action: 'print-batch', queue: [
    { id: 'etiquetas', format: 'ETIQUETA' }, { id: 'etiqueta_extra', format: 'ETIQUETA' },
  ] })
})

it('salva A4 ao escolher o formato do comprovante', async () => {
  abrir()
  fireEvent.click(screen.getByText('Comprovante'))
  const a4 = screen.getAllByRole('button', { name: 'A4' }).find(button => !(button as HTMLButtonElement).disabled)
  if (!a4) throw new Error('Formato A4 indisponível')
  fireEvent.click(a4)
  await waitFor(() => expect(preferencias.guardar).toHaveBeenCalledWith('comprovante', 'A4'))
})

it('envia o formato A4 salvo tanto nos detalhes quanto no pós-cadastro', async () => {
  preferencias.formatos = { comprovante: 'A4' }
  const onConfirm = vi.fn()
  const detalhes = render(<AttendancePrintSelectionModal open onClose={() => {}} onConfirm={onConfirm} order={order} />)
  fireEvent.click(screen.getByText('Comprovante'))
  fireEvent.click(screen.getByRole('button', { name: /^Imprimir$/i }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalled())
  expect(onConfirm.mock.calls[0][0].options.find((o: any) => o.id === 'comprovante').selectedFormat).toBe('A4')
  detalhes.unmount()
  onConfirm.mockClear()
  render(<AttendancePrintSelectionModal open multiSelect onClose={() => {}} onConfirm={onConfirm} order={order} />)
  fireEvent.click(screen.getByText('Comprovante'))
  fireEvent.click(screen.getByRole('button', { name: /^CONFIRMAR$/i }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalled())
  expect(onConfirm.mock.calls[0][0].queue).toEqual([{ id: 'comprovante', format: 'A4' }])
})
