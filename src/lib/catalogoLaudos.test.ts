import { describe, it, expect } from 'vitest'
import { linhaLaudo, lerLinhaLaudo } from './catalogoLaudos'

describe('laudos na planilha do catálogo', () => {
  it('ida e volta preserva o laudo e o modelo, mesmo grande', () => {
    const laudo: any = { code: 'L003', name: 'Tipo I', sort_order: 3, is_active: false, parameters: [{ name: 'x'.repeat(70000) }],
      template: { name: 'EAS', description: 'layout:eas-touros-l003' } }
    const row = linhaLaudo('EAS', laudo)
    expect(Object.keys(row).filter(k => k.startsWith('Configuração')).length).toBe(3)
    expect(lerLinhaLaudo(row)).toEqual({ codigoExame: 'EAS', laudo })
  })
  it('linha sem configuração é ignorada', () => {
    expect(lerLinhaLaudo({ 'Código': 'EAS' })).toBeNull()
  })
})
