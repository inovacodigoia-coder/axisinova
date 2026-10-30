import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { defaultLabelConfig } from '@/types/label-config.types'
import { SampleLabelsPrintModal } from './SampleLabelsPrintModal'

vi.mock('@/hooks/useLabelConfig', () => ({ useLabelConfig: () => ({ config: defaultLabelConfig }) }))
vi.mock('@/components/print/ServidorImpressaoStatus', () => ({ ServidorImpressaoStatus: () => null }))

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('envia o código da prévia de cada tubo, não o número compartilhado do pedido', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, etiquetas: 3 }) })
  vi.stubGlobal('fetch', fetchMock)
  render(<SampleLabelsPrintModal
    open onClose={() => {}} orderNumber="296-00" patientName="PACIENTE TESTE"
    labels={[
      { sampleId: '296-00-1-2', labelIndex: 1, material: 'GEL', tube: 'GEL', workbench: 'BIOQUÍMICA' },
      { sampleId: '296-00-2-2', labelIndex: 2, material: 'EDTA', tube: 'EDTA', workbench: 'HEMATOLOGIA' },
      { sampleId: '296-00-3-2', labelIndex: 3, material: 'URINA', tube: 'URINA', workbench: 'UROANÁLISE' },
    ]}
  />)
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir', exact: true }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  const enviados = JSON.parse(fetchMock.mock.calls[1][1].body)
  expect(enviados.tipo).toBe('etiqueta_cliente')
  expect(enviados.etiquetas.map((e: { codigoAlfanumerico: string }) => e.codigoAlfanumerico)).toEqual(['BWWFNO1L1', 'BI89H0LC1', 'KFWD6EDA3'])
  expect(enviados.etiquetas.map((e: { codigoAmostra: string }) => e.codigoAmostra)).toEqual(['296-00-1-2', '296-00-2-2', '296-00-3-2'])
  expect(enviados.etiquetas.map((e: { codigoExterno: string }) => e.codigoExterno)).toEqual(['296-00', '296-00', '296-00'])
})