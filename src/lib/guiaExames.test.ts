import { describe, it, expect } from 'vitest'
import { indiceExameNaGuia, examesRepetidosNasGuias } from './guiaExames'

describe('exame repetido na guia', () => {
  const exams = [{ id: 'tgo', name: 'TGO' }, { id: 'ureia', name: 'Ureia' }]
  it('encontra exame já incluído', () => expect(indiceExameNaGuia(exams, { id: 'ureia' })).toBe(1))
  it('exame novo não é repetido', () => expect(indiceExameNaGuia(exams, { id: 'tsh' })).toBe(-1))
  it('editar o próprio item não conta como repetido', () => expect(indiceExameNaGuia(exams, { id: 'tgo' }, 0)).toBe(-1))
  it('bloqueia guia com o mesmo exame duas vezes ao salvar', () => {
    expect(examesRepetidosNasGuias([{ name: 'SUS', exams: [...exams, { id: 'tgo', name: 'TGO' }] }])).toEqual(['SUS: TGO'])
  })
  it('mesmo exame em guias diferentes é permitido', () => {
    expect(examesRepetidosNasGuias([{ exams: [exams[0]] }, { exams: [exams[0]] }])).toEqual([])
  })
})
