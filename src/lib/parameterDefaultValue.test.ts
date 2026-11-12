import { describe, it, expect } from 'vitest'
import { defaultResultValue, defaultResultUpdates, onlyUntouchedDefaults } from './parameterDefaultValue'
import { buildExamParams } from '@/utils/examParameters'

describe('campo Valor dos parâmetros', () => {
  it('só vale quando ativo e preenchido', () => {
    expect(defaultResultValue({ defaultValueEnabled: true, defaultValue: ' 12,5 ' })).toBe('12,5')
    expect(defaultResultValue({ defaultValueEnabled: false, defaultValue: '12,5' })).toBe('')
    expect(defaultResultValue({ defaultValueEnabled: true, defaultValue: '' })).toBe('')
  })

  it('chega na digitação pelo buildExamParams', () => {
    const params = buildExamParams({ name: 'TP', parameters: [
      { id: 1, name: 'TP (controle médio)', defaultValueEnabled: true, defaultValue: '12,0' },
      { id: 2, name: 'ISI', defaultValueEnabled: false, defaultValue: '1,0' },
    ] }, 'TP', {})
    expect(params[0].defaultValue).toBe('12,0')
    expect(params[1].defaultValue).toBe('')
  })

  it('preenche campo vazio de exame sem resultado salvo', () => {
    const u = defaultResultUpdates({ examId: 'e', params: [{ id: '1', defaultValue: '12,0' }, { id: '2', defaultValue: '' }], results: {}, hasSavedResult: false })
    expect(u).toEqual({ e_1: '12,0' })
  })

  it('não substitui valor digitado nem mexe em exame já salvo ou liberado', () => {
    const params = [{ id: '1', defaultValue: '12,0' }]
    expect(defaultResultUpdates({ examId: 'e', params, results: { e_1: '13' }, hasSavedResult: false })).toEqual({})
    expect(defaultResultUpdates({ examId: 'e', params, results: {}, hasSavedResult: true })).toEqual({})
    expect(defaultResultUpdates({ examId: 'e', params, results: {}, hasSavedResult: false, released: true })).toEqual({})
  })

  it('não preenche campo CALC', () => {
    expect(defaultResultUpdates({ examId: 'e', params: [{ id: '1', isCalculated: true, defaultValue: '1' }], results: {}, hasSavedResult: false })).toEqual({})
  })

  it('exame só com valores padrão intocados não vira rascunho', () => {
    const params = [{ id: '1' }, { id: '2' }]
    const defaults = { e_1: '12,0' }
    expect(onlyUntouchedDefaults({ examId: 'e', params, results: { e_1: '12,0' }, defaults })).toBe(true)
    expect(onlyUntouchedDefaults({ examId: 'e', params, results: { e_1: '12,0', e_2: '15' }, defaults })).toBe(false)
    expect(onlyUntouchedDefaults({ examId: 'e', params, results: { e_1: '11' }, defaults })).toBe(false)
  })
})
