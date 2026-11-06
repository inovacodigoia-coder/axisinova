import { describe, it, expect } from 'vitest'
import { displayReference, importReferenceModeColumns, exportReferenceModeColumns } from './examReferenceMode'

describe('referência simples x completa', () => {
  it('modo completo mostra o texto inteiro', () => {
    expect(displayReference({ referenceMode: 'completa', referenceFullText: 'A\nB' }, '< 75')).toBe('A\nB')
  })
  it('modo simples (ou completo vazio) mostra a faixa', () => {
    expect(displayReference({ referenceMode: 'simples', referenceFullText: 'A' }, '< 75')).toBe('< 75')
    expect(displayReference({ referenceMode: 'completa', referenceFullText: '  ' }, '< 75')).toBe('< 75')
  })
  it('exporta e importa as colunas; planilha antiga não altera', () => {
    const cols = exportReferenceModeColumns({ referenceMode: 'completa', referenceFullText: 'X' })
    expect(importReferenceModeColumns(cols)).toEqual({ referenceMode: 'completa', referenceFullText: 'X' })
    expect(importReferenceModeColumns({ Nome: 'a' })).toEqual({})
  })
})
