import { describe, expect, it } from 'vitest'
import { coletaEasLaudo3, configurarLaudoImpresso, EAS_LAUDO3_LAYOUT, isEasLaudo3, parametrosEasLaudo3 } from './easLaudo3'

describe('EAS L003 exclusivo e sem resultados do PDF', () => {
  it('usa a coleta do exame no fuso de Touros, sem substituí-la pela data do pedido', () => {
    expect(coletaEasLaudo3({ collectedAt: '2026-11-27T17:20:00Z' }, { collectionTime: '2026-11-26T12:00:00Z' })).toBe('27/11/2026, 14:20')
    expect(coletaEasLaudo3({}, {})).toBe('—')
  })
  it('cadastra 23 campos nos quatro grupos do modelo sem valores preenchidos', () => {
    const params = parametrosEasLaudo3([{ id: '9', defaultValueEnabled: true, defaultValue: 'Ausente' }])
    expect(params).toHaveLength(23)
    expect(new Set(params.map(p => p.section)).size).toBe(4)
    expect(params.every(p => !p.defaultValueEnabled && p.defaultValue === '')).toBe(true)
    expect(params.filter(p => p.section === 'EXAME FÍSICO')).toHaveLength(5)
    expect(params.filter(p => p.section === 'EXAME QUÍMICO')).toHaveLength(9)
    expect(params.filter(p => p.section === 'EXAME MICROSCÓPICO DO SEDIMENTO')).toHaveLength(7)
  })
  it('preserva as referências e as unidades do modelo somente no novo laudo', () => {
    const params = parametrosEasLaudo3()
    expect(params.find(p => p.id === '6')?.referenceFullText).toBe('1.005 a 1.030')
    expect(params.find(p => p.id === '7')?.referenceFullText).toBe('5,0 a 6,5')
    expect(params.find(p => p.id === '23')?.referenceFullText).toBe('Inferior a 5 por campo')
    expect(params.find(p => p.id === '18')?.unit).toBe('por campo')
    expect(params.find(p => p.id === '21')?.referenceValues).toEqual([])
  })
  it('não ativa o novo desenho por nome EAS ou código L003 sem o modelo explícito', () => {
    expect(isEasLaudo3({ name: 'EAS', laudoCode: 'L003' })).toBe(false)
    expect(isEasLaudo3({ reportTemplate: { description: EAS_LAUDO3_LAYOUT } })).toBe(true)
  })
  it('mantém a prévia explícita mesmo quando o catálogo tem outro modelo', () => {
    const explicit = { id: 'l003', description: EAS_LAUDO3_LAYOUT }
    const result = configurarLaudoImpresso({ reportTemplate: explicit }, { report_template_id: 'padrao' }, null, [{ id: 'padrao' }])
    expect(result.reportTemplate).toBe(explicit)
  })
  it('usa a configuração do laudo persistido, sem trocar valores ou referências salvos', () => {
    const result = configurarLaudoImpresso({ results: [{ parameterId: '17', value: '++', referenceRange: 'Referência salva' }] },
      { report_template_id: 'padrao' }, { report_template_id: 'l003', parameters: parametrosEasLaudo3() }, [{ id: 'l003', single_page: true }])
    expect(result.reportTemplate.id).toBe('l003')
    expect(result.singlePage).toBe(true)
    expect(result.results[0]).toMatchObject({ value: '++', referenceRange: 'Referência salva', section: 'EXAME QUÍMICO', reportLabel: 'Leucócitos' })
  })
})