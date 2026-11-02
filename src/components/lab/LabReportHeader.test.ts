import { describe, expect, it } from 'vitest'
import { subtitleLines } from './LabReportHeader'

describe('subtitleLines', () => {
  it('returns one line per Shift+Enter break, keeping order', () => {
    expect(subtitleLines('SECRETARIA MUNICIPAL DE SAÚDE\nPREFEITURA MUNICIPAL DE TOUROS')).toEqual([
      'SECRETARIA MUNICIPAL DE SAÚDE',
      'PREFEITURA MUNICIPAL DE TOUROS',
    ])
  })

  it('normalizes Windows line breaks and drops blank lines', () => {
    expect(subtitleLines('LAB\r\n\r\nUNIDADE MOVEIS\r\n')).toEqual(['LAB', 'UNIDADE MOVEIS'])
  })

  it('returns nothing when the subtitle is empty', () => {
    expect(subtitleLines(undefined)).toEqual([])
    expect(subtitleLines('   \n  \n')).toEqual([])
  })
})
