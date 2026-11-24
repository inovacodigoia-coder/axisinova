import { describe, it, expect } from 'vitest'
import { resolvedoresEtiqueta } from './tubos'

const r = resolvedoresEtiqueta(
  [{ id: 'c1', name: 'Hemograma Completo', internalCode: 'H', workbenchId: 'w1' }],
  [{ id: 'w1', name: 'HEMATOLOGIA' }],
)

describe('etiqueta: mesma bancada e código da prévia', () => {
  it('usa a bancada do catálogo, não GERAL', () => {
    expect(r.bancadaDoTubo([{ examId: 'c1', name: 'Hemograma Completo' }])).toBe('HEMATOLOGIA')
  })
  it('usa o código do exame, não o nome', () => {
    expect(r.codigoDoExame({ examId: 'c1', name: 'Hemograma Completo' })).toBe('H')
  })
})
