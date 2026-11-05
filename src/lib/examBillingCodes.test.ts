import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { exportExamBillingCodes, importExamBillingCodes } from './examBillingCodes'
describe('Códigos do catálogo', () => {
 it('exporta e importa TUSS/SIGTAP separados preservando zero inicial', () => {
  const row = { Nome: 'Ácido úrico', Código: 'ACUR', ...exportExamBillingCodes({ tussCode: '40301150', sigtapCode: '0202010120' }) }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([row]), 'Catálogo de Exames')
  const imported = XLSX.read(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }), { type: 'array' })
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(imported.Sheets['Catálogo de Exames'], { raw: false, defval: '' })
  expect(importExamBillingCodes(rows[0])).toEqual({ tussCode: '40301150', sigtapCode: '0202010120' })
 })
 it('planilha antiga sem as colunas não apaga códigos cadastrados', () => {
  expect({ tussCode: '40301150', sigtapCode: '0202010120', ...importExamBillingCodes({ Nome: 'Exame', Código: 'H' }) }).toEqual({ tussCode: '40301150', sigtapCode: '0202010120' })
 })
 it('células explicitamente vazias limpam os códigos opcionais', () => {
  expect(importExamBillingCodes({ 'Código TUSS': '', 'Código SIGTAP': '' })).toEqual({ tussCode: '', sigtapCode: '' })
 })
})