import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LabCustomReportDocument } from './LabCustomReportDocument'
import { buildCustomLines, DEFAULT_FIELDS, type CustomFields } from '@/lib/labCustomReport'

const catalog = [{ id: 'hb', name: 'Hemograma', internalCode: 'HEM', workbenchId: 'w1' }]
const benches = [{ id: 'w1', name: 'Hematologia' }]
const orders = [
  { registeredAt: '2026-11-10T13:00:00Z', protocol: '1-01', originName: 'Tibau do Sul', patientId: 'p1', patientName: 'Ana', labGuides: [{ exams: [{ examId: 'hb', price: 10 }] }] },
]
const filters = { from: '2026-11-01', to: '2026-11-30', origin: 'all', workbench: 'all', convenio: 'all' }
const lines = buildCustomLines(orders as any, catalog as any, benches, filters)

const props = (fields: CustomFields) => ({
  brandName: 'LAB MUNICIPAL',
  periodLabel: '10/11/2026 a 10/11/2026',
  generatedAt: '10/11/2026 12:00',
  filters: 'Origem: Todas · Bancada: Todas · Convênio: Todos',
  layout: 'exame' as const,
  sort: 'data' as const,
  benchPatients: true,
  fields,
  lines,
})

describe('relatório personalizado: origem na linha do paciente', () => {
  it('mostra a origem logo depois do pedido', () => {
    const { container } = render(<LabCustomReportDocument {...props(DEFAULT_FIELDS)} />)
    const row = [...container.querySelectorAll('tr')].find(tr => tr.textContent?.includes('Ana'))!
    expect([...row.querySelectorAll('td')].map(td => td.textContent)).toEqual(['10/11/2026', '1-01', 'Tibau do Sul', 'Ana'])
  })

  it('some com a origem quando o campo é desmarcado', () => {
    const { container } = render(<LabCustomReportDocument {...props({ ...DEFAULT_FIELDS, origem: false })} />)
    expect(container.textContent).not.toContain('Tibau do Sul')
    expect(screen.getByText('Ana')).toBeTruthy()
  })
})
