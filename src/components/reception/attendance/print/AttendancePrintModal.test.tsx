import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AttendancePrintModal } from './AttendancePrintModal'
import type { AttendanceControlDocument, PrinterConfig } from '@/types/payment-print.types'

const mocks = vi.hoisted(() => ({ send: vi.fn(), ping: vi.fn(), pdf: vi.fn() }))
vi.mock('@/hooks/usePrinterConfig', () => ({ usePrinterConfig: () => ({ printers: [], getDefault: () => ({ id: 'test', paperSize: 'a4', orientation: 'portrait' }) }) }))
vi.mock('@/components/print/ServidorImpressaoStatus', () => ({ ServidorImpressaoStatus: () => null }))
vi.mock('@/hooks/useExternalAccesses', () => ({ passwordHint: () => '' }))
vi.mock('@/lib/impressaoLocal', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/impressaoLocal')>(), imprimirDireto: mocks.send, servidorImpressaoAtivo: mocks.ping }))
vi.mock('@/lib/labelPdf', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/labelPdf')>(), gerarPdfElementos: mocks.pdf }))
const doc = { orderNumber: '17-00', patientName: 'PACIENTE TESTE', companyName: 'LAB TESTE', exams: [], attachments: [] } as unknown as AttendanceControlDocument
const config = { id: 'test', paperSize: 'a4', orientation: 'portrait' } as PrinterConfig
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })

it.each(['comprovante', 'controle_interno', 'termo_consentimento'])('envia %s para sua configuração e avança após sucesso', async type => {
  mocks.ping.mockResolvedValue(true)
  mocks.send.mockResolvedValue({ mensagem: 'Enviado' })
  mocks.pdf.mockResolvedValue(new Blob())
  const done = vi.fn()
  render(<AttendancePrintModal open onClose={() => {}} document={doc} overrideConfig={config} documentType={type} vias={['patient']} onPrinted={done} />)
  fireEvent.click(screen.getByRole('button', { name: /^Imprimir$/ }))
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1))
  expect(mocks.send.mock.calls[0][0]).toBe(type === 'comprovante' ? 'comprovante_cliente' : type)
})

it('não avança automaticamente quando o servidor recusa o trabalho', async () => {
  mocks.ping.mockResolvedValue(true)
  mocks.send.mockRejectedValue(new Error('Impressora indisponível'))
  mocks.pdf.mockResolvedValue(new Blob())
  const done = vi.fn()
  render(<AttendancePrintModal open onClose={() => {}} document={doc} overrideConfig={config} onPrinted={done} />)
  fireEvent.click(screen.getByRole('button', { name: /^Imprimir$/ }))
  await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1))
  expect(done).not.toHaveBeenCalled()
})