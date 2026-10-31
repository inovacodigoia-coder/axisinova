import { describe, it, expect } from 'vitest'
import { prepararFilaImpressao } from './attendancePrintQueue'

describe('impressões selecionadas após pedido', () => {
  it('junta comprovante e controle em uma folha mantendo termo e etiquetas na fila', () => {
    expect(prepararFilaImpressao([
      { id: 'comprovante', format: 'A4' }, { id: 'controle_interno', format: 'A4' },
      { id: 'termo_consentimento', format: 'A4' }, { id: 'etiquetas', format: 'ETIQUETA' },
    ])).toEqual([
      { id: 'comprovante_controle', format: 'A4' },
      { id: 'termo_consentimento', format: 'A4' }, { id: 'etiquetas', format: 'ETIQUETA' },
    ])
  })
  it('mantém A5 quando as duas vias selecionam A5', () => {
    expect(prepararFilaImpressao([{ id: 'comprovante', format: 'A5' }, { id: 'controle_interno', format: 'A5' }]))
      .toEqual([{ id: 'comprovante_controle', format: 'A5' }])
  })
  it('usa folha A4 para combinar vias térmicas ou formatos diferentes', () => {
    expect(prepararFilaImpressao([{ id: 'comprovante', format: 'TÉRMICA' }, { id: 'controle_interno', format: 'A5' }]))
      .toEqual([{ id: 'comprovante_controle', format: 'A4' }])
  })
  it('não imprime documentos que não foram selecionados', () => {
    expect(prepararFilaImpressao([{ id: 'controle_interno', format: 'A4' }])).toEqual([{ id: 'controle_interno', format: 'A4' }])
    expect(prepararFilaImpressao([])).toEqual([])
  })
})