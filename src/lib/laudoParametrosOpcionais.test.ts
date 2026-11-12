import { describe, expect, it } from 'vitest'
import { linhasDoLaudo, marcarOpcionais } from './laudoParametrosOpcionais'

const exame = {
  parameters: [
    { id: 1, name: 'Colesterol Total', isMandatory: true },
    { id: 5, name: 'Colesterol VLDL', isMandatory: true },
    { id: 6, name: 'OBS:', isMandatory: false },
  ],
}

describe('parâmetros não obrigatórios no laudo', () => {
  it('Obrig desmarcado e vazio não sai no laudo', () => {
    const rows = marcarOpcionais([
      { parameterId: '1', parameterName: 'Colesterol Total', value: '180' },
      { parameterId: '6', parameterName: 'OBS:', value: '' },
    ], exame)
    expect(linhasDoLaudo(rows).map((r) => r.parameterName)).toEqual(['Colesterol Total'])
  })

  it('Obrig desmarcado com resultado continua no laudo', () => {
    const rows = marcarOpcionais([{ parameterId: '6', parameterName: 'OBS:', value: 'Amostra lipêmica' }], exame)
    expect(linhasDoLaudo(rows)).toHaveLength(1)
  })

  it('Obrig marcado e vazio continua no laudo', () => {
    const rows = marcarOpcionais([{ parameterId: '5', parameterName: 'Colesterol VLDL', value: '' }], exame)
    expect(linhasDoLaudo(rows)).toHaveLength(1)
  })

  it('acha o parâmetro pelo nome quando o código não bate', () => {
    const rows = marcarOpcionais([{ parameterId: '99', parameterName: 'obs:', value: '  ' }], exame)
    expect(linhasDoLaudo(rows)).toHaveLength(0)
  })
})
