import { describe, it, expect } from 'vitest'
import { buildCustomLines, groupByExam, groupByBench, groupByPatient, exportRows, DEFAULT_FIELDS } from './labCustomReport'
const catalog = [{ id: 'hb', name: 'Hemograma', internalCode: 'HEM', workbenchId: 'w1' }, { id: 'gl', name: 'Glicose', internalCode: 'GLI', workbenchId: 'w2' }]
const benches = [{ id: 'w1', name: 'Hematologia' }, { id: 'w2', name: 'Bioquímica' }]
const orders = [
  { registeredAt: '2026-11-10T13:00:00Z', protocol: '1-01', originName: 'Tibau do Sul', patientId: 'p1', patientName: 'Ana', labGuides: [{ exams: [{ examId: 'hb', price: 10 }, { examId: 'gl', price: 5 }, { examId: 'gl', status: 'cancelled', price: 99 }] }] },
  { registeredAt: '2026-11-11T13:00:00Z', protocol: '2-01', originName: 'PASSA E FICA', patientId: 'p2', patientName: 'Bruno', labGuides: [{ exams: [{ examId: 'hb', price: 12 }] }] },
  { registeredAt: '2026-11-11T13:00:00Z', status: 'deleted', patientName: 'X', labGuides: [{ exams: [{ examId: 'hb' }] }] },
]
const f = { from: '2026-11-01', to: '2026-11-30', origin: 'all', workbench: 'all', convenio: 'all' }
const lines = buildCustomLines(orders, catalog, benches, f)
describe('relatório personalizado', () => {
  it('ignora cancelados e excluídos', () => expect(lines).toHaveLength(3))
  it('por exame lista pacientes, quantidade e valor', () => {
    const hb = groupByExam(lines).find(g => g.key === 'hb')!
    expect(hb.lines.map(l => l.patient)).toEqual(['Ana', 'Bruno']); expect(hb.count).toBe(2); expect(hb.value).toBe(22); expect(hb.sub).toBe('Hematologia')
  })
  it('total por bancada', () => expect(groupByBench(lines).map(b => [b.title, b.count])).toEqual([['Bioquímica', 1], ['Hematologia', 2]]))
  it('por paciente soma valores', () => expect(groupByPatient(lines).find(p => p.title === 'Ana')!.value).toBe(15))
  it('campo desmarcado não sai na exportação', () => {
    const r = exportRows(lines, 'tabela', { ...DEFAULT_FIELDS, valor: false }, 'data')
    expect(Object.keys(r[0])).not.toContain('Valor (R$)')
    expect(Object.keys(exportRows(lines, 'tabela', { ...DEFAULT_FIELDS, valor: true }, 'data')[0])).toContain('Valor (R$)')
  })
  it('origem sai logo depois do pedido', () => {
    expect(lines.map(l => l.origin)).toEqual(['Tibau do Sul', 'Tibau do Sul', 'PASSA E FICA'])
    const r = exportRows(lines, 'tabela', DEFAULT_FIELDS, 'data')
    expect(r[0].Pedido).toBe('1-01'); expect(r[0].Origem).toBe('Tibau do Sul')
    expect(Object.keys(exportRows(lines, 'tabela', { ...DEFAULT_FIELDS, origem: false }, 'data')[0])).not.toContain('Origem')
  })
})
