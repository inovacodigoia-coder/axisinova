import { useState } from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SampleLabelsSelectModal } from './SampleLabelsSelectModal'
import { defaultLabelConfig } from '@/types/label-config.types'

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { companyId: 'test' } }) }))
vi.mock('@/hooks/useCompanySequenceId', () => ({ useCompanySequenceIdState: () => ({ id: 2, ready: true }) }))
vi.mock('@/hooks/useLabSettings', () => ({ useLabSettings: () => ({ settings: {} }) }))
vi.mock('@/hooks/useLabelConfig', () => ({ useLabelConfig: () => ({ config: defaultLabelConfig }) }))
vi.mock('@/components/print/ServidorImpressaoStatus', () => ({ ServidorImpressaoStatus: () => null }))
vi.mock('@/lib/cadastroEtiqueta', () => ({ carregarCadastroEtiqueta: async () => ({
  exames: [{ id: 'hemo', name: 'Hemograma', internalCode: 'H', workbenchId: 'hem' }, { id: 'hiv', name: 'HIV', internalCode: 'HIV', workbenchId: 'tr' }],
  bancadas: [{ id: 'hem', name: 'HEMATOLOGIA' }, { id: 'tr', name: 'TESTES RÁPIDOS' }],
}) }))
vi.mock('@/lib/tubos', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/tubos')>()
  return { ...original, useMateriaisTubos: () => null }
})

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('envia etiquetas normais e extras consecutivamente mesmo quando têm a mesma quantidade', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, etiquetas: 2 }) })
  vi.stubGlobal('fetch', fetchMock)
  const terminou = vi.fn()
  const order = { orderNumber: '296-00', empresaSeq: 2, patientName: 'PACIENTE FICTÍCIO', labGuides: [{ exams: [
    { examId: 'hemo', name: 'Hemograma', material: 'EDTA', collected: true },
    { examId: 'hiv', name: 'HIV', material: 'Soro', collected: true, etiquetaSeparada: 'testes_rapidos' },
  ] }] }
  function Fila() {
    const [job, setJob] = useState('etiquetas')
    if (job === 'fim') return null
    return <SampleLabelsSelectModal key={job} open autoPrint order={order} onClose={() => {}}
      extra={job === 'etiqueta_extra' ? { paciente: true, exame: true, dataColeta: true } : undefined}
      total={job === 'etiqueta_extra' ? 2 : undefined}
      onPrinted={() => { if (job === 'etiqueta_extra') terminou(); setJob(job === 'etiquetas' ? 'etiqueta_extra' : 'fim') }} />
  }
  render(<Fila />)
  await waitFor(() => expect(terminou).toHaveBeenCalledTimes(1), { timeout: 3000 })
  const jobs = fetchMock.mock.calls.filter(call => call[1]?.method === 'POST').map(call => JSON.parse(call[1].body))
  expect(jobs).toHaveLength(2)
  expect(jobs.map(job => job.etiquetas.length)).toEqual([2, 2])
  expect(jobs[0].etiquetas.map((e: any) => e.painel)).toEqual(['TESTES RÁPIDOS', 'HEMATOLOGIA'])
  expect(jobs[1].etiquetas.map((e: any) => e.exames)).toEqual(['HIV Hemograma', 'HIV Hemograma'])
  expect(jobs[1].etiquetas.map((e: any) => e.painel)).toEqual([undefined, undefined])
})