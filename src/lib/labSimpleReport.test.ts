import { describe, it, expect } from 'vitest'
import { buildSimpleExamReport, simpleReportColumns } from './labSimpleReport'
const catalog = [{ id: 'a', name: 'Ácido úrico', internalCode: 'ACUR', tussCode: '40301150', sigtapCode: '0202010120', workbenchId: 'bio' }, { id: 'h', name: 'Hemograma', internalCode: 'H', workbenchId: 'hem' }]
const filters = { from: '2026-11-05', to: '2026-11-05', origin: 'all', workbench: 'all', convenio: 'all' }
const orders = [{ status: 'open', examMode: 'lab', registeredAt: '2026-11-06T02:59:59Z', originName: 'Touros', convenioName: 'SUS', labGuides: [{ exams: [{ examId: 'a' }, { examId: 'h' }] }] }, { status: 'open', examMode: 'lab', registeredAt: '2026-11-05T03:00:00Z', originName: 'Touros', convenioName: 'SUS', labGuides: [{ exams: [{ examId: 'a' }] }] }]
describe('Resumo simples por exame', () => {
 it('soma exames e mantém TUSS/SIGTAP em campos separados', () => {
  const rows = buildSimpleExamReport(orders, catalog, filters)
  expect(rows).toEqual([{ key: 'a', abbreviation: 'ACUR', name: 'Ácido úrico', tussCode: '40301150', sigtapCode: '0202010120', count: 2 }, { key: 'h', abbreviation: 'H', name: 'Hemograma', tussCode: '', sigtapCode: '', count: 1 }])
 })
 it('código vazio não gera coluna quando todos estão vazios', () => {
  expect(simpleReportColumns(buildSimpleExamReport(orders, catalog, { ...filters, workbench: 'hem' }))).toEqual({ tuss: false, sigtap: false })
 })
 it('TUSS vazio não oculta SIGTAP preenchido', () => {
  expect(simpleReportColumns([{ key:'a', abbreviation:'ACUR', name:'Ácido úrico', tussCode:'', sigtapCode:'0202010120',count:1 }])).toEqual({ tuss: false, sigtap: true })
 })
 it('filtra origem, bancada e convênio sem cruzar guias', () => {
  expect(buildSimpleExamReport(orders, catalog, { ...filters, origin: 'Touros', workbench: 'bio', convenio: 'SUS' })[0].count).toBe(2)
  expect(buildSimpleExamReport(orders, catalog, { ...filters, convenio: 'Particular' })).toEqual([])
  expect(buildSimpleExamReport(orders, catalog, { ...filters, origin: 'Outra' })).toEqual([])
 })
 it('inclui extremos do dia de Brasília e exclui fora do período', () => {
  const outside = [{ ...orders[0], registeredAt: '2026-11-06T03:00:00Z' }, { ...orders[1], registeredAt: '2026-11-05T02:59:59Z' }]
  expect(buildSimpleExamReport(outside, catalog, filters)).toEqual([])
 })
 it('não conta pedidos ou exames cancelados/excluídos', () => {
  expect(buildSimpleExamReport([{ ...orders[0], status: 'cancelled' }, { ...orders[0], status: 'deleted' }, { ...orders[0], labGuides: [{ exams: [{ examId: 'a', status: 'cancelado' }] }] }], catalog, filters)).toEqual([])
 })
})