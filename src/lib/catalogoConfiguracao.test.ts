import { describe, it, expect } from 'vitest'
import { configuracaoExame, configuracaoParametro, lerConfiguracao, lerColunasExtrasParametro } from './catalogoConfiguracao'

describe('catálogo: configuração completa', () => {
  it('exame leva tudo menos ids e parâmetros', () => {
    const cfg = lerConfiguracao({ 'Configuração completa': configuracaoExame({ id: 'x', companyId: 'c', workbenchId: 'w', methodology: 'M', parameters: [1] }) }, 'exame')
    expect(cfg).toEqual({ methodology: 'M' })
  })
  it('parâmetro leva Valor, Editar e Várias', () => {
    const row = { 'Configuração completa': configuracaoParametro({ id: 3, name: 'Cor', defaultValueEnabled: true, defaultValue: 'Amarelo', allowEditSelection: true, multiSelect: true, referenceValues: [] }) }
    expect(lerConfiguracao(row, 'parametro')).toEqual({ name: 'Cor', defaultValueEnabled: true, defaultValue: 'Amarelo', allowEditSelection: true, multiSelect: true })
  })
  it('planilha antiga não muda nada', () => {
    expect(lerConfiguracao({}, 'parametro')).toEqual({})
    expect(lerColunasExtrasParametro({ Nome: 'x' })).toEqual({})
  })
  it('colunas extras', () => {
    expect(lerColunasExtrasParametro({ 'Valor padrão ativo': 'Sim', 'Valor padrão': '0,2', 'Várias opções': 'Não', 'Casas decimais': '2' }))
      .toEqual({ defaultValueEnabled: true, defaultValue: '0,2', multiSelect: false, decimals: 2 })
  })
})
