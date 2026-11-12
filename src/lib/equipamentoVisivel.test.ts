import { describe, it, expect } from 'vitest'
import { equipamentoVisivelParaEmpresa } from './equipamentoVisivel'

describe('equipamentos visíveis para a empresa', () => {
  it('compartilhado inativo não aparece', () => {
    expect(equipamentoVisivelParaEmpresa({ source_equipment_id: 'src-1', is_active: false })).toBe(false)
  })
  it('compartilhado ativo aparece', () => {
    expect(equipamentoVisivelParaEmpresa({ source_equipment_id: 'src-1', is_active: true })).toBe(true)
  })
  it('equipamento próprio aparece mesmo inativo', () => {
    expect(equipamentoVisivelParaEmpresa({ source_equipment_id: null, is_active: false })).toBe(true)
  })
})
