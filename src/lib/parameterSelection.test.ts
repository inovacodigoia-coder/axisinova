import { describe, expect, it } from 'vitest'
import { selectionModes, selectedOptions, toggleOption } from './parameterSelection'
import { buildExamParams } from '@/utils/examParameters'

const cores = ['Amarelo citrino', 'Amarelo claro', 'Âmbar']

describe('opções Editar e Várias da Seleção', () => {
  it('só valem para parâmetro do tipo Seleção', () => {
    expect(selectionModes({ type: 'selection', allowEditSelection: true, multiSelect: true })).toEqual({ editable: true, multiple: true })
    expect(selectionModes({ type: 'text', allowEditSelection: true, multiSelect: true })).toEqual({ editable: false, multiple: false })
    expect(selectionModes({ type: 'selection' })).toEqual({ editable: false, multiple: false })
  })

  it('marcar várias junta com vírgula na ordem do cadastro', () => {
    let v = toggleOption('', 'Âmbar', cores)
    v = toggleOption(v, 'Amarelo citrino', cores)
    expect(v).toBe('Amarelo citrino, Âmbar')
    expect(selectedOptions(v, cores)).toEqual(['Amarelo citrino', 'Âmbar'])
  })

  it('desmarcar tira só aquela opção', () => {
    expect(toggleOption('Amarelo citrino, Âmbar', 'Amarelo citrino', cores)).toBe('Âmbar')
  })

  it('texto editado à mão é mantido ao marcar outra opção', () => {
    expect(toggleOption('Amarelo citrino, levemente turvo', 'Âmbar', cores)).toBe('Amarelo citrino, Âmbar, levemente turvo')
  })

  it('a digitação recebe as opções do cadastro', () => {
    const [p] = buildExamParams({ name: 'Urina', parameters: [
      { id: 1, name: 'Cor', type: 'selection', options: cores, allowEditSelection: true, multiSelect: true },
    ] }, 'Urina', {})
    expect(p.editable).toBe(true)
    expect(p.multiple).toBe(true)
  })
})
