import { describe, expect, it, vi } from 'vitest'
import {
  MANUAL_CALCULATED_SOURCE,
  calculatedResultSource,
  calculatedResultValue,
  isManualCalculatedSource,
  shouldCalculateAutomatically,
} from './calculatedResultOverride'

const calculated = { isCalculated: true }

describe('edição manual de parâmetros CALC', () => {
  it('mantém a fórmula como comportamento padrão', () => {
    expect(calculatedResultValue({ param: calculated, storedValue: '', calculate: () => '211,5' })).toBe('211,5')
  })

  it('preserva o valor do aparelho por padrão e calcula quando preferFormula estiver ativo', () => {
    expect(shouldCalculateAutomatically(calculated, { instrumentReceived: true })).toBe(false)
    expect(shouldCalculateAutomatically({ ...calculated, preferFormula: true }, { instrumentReceived: true })).toBe(true)
  })

  it('deixa o campo vazio após apagar pela caneta, sem chamar a fórmula novamente', () => {
    const calculate = vi.fn(() => '211,5')
    const value = calculatedResultValue({ param: calculated, storedValue: '', manualOverride: true, calculate })
    expect(value).toBe('')
    expect(calculate).not.toHaveBeenCalled()
  })

  it('permite substituir o calculado por um valor manual', () => {
    expect(calculatedResultValue({ param: calculated, storedValue: '200', manualOverride: true, calculate: () => '211,5' })).toBe('200')
  })

  it('volta a calcular quando a edição manual é removida', () => {
    expect(calculatedResultValue({ param: calculated, storedValue: '', manualOverride: false, calculate: () => '53,2' })).toBe('53,2')
  })

  it('grava e reconhece a origem da edição manual para preservar o vazio ao reabrir', () => {
    const source = calculatedResultSource({ manualOverride: true, instrumentReceived: true })
    expect(source).toBe(MANUAL_CALCULATED_SOURCE)
    expect(isManualCalculatedSource(source)).toBe(true)
    expect(calculatedResultSource({ manualOverride: false, instrumentReceived: true })).toBe('instrument')
    expect(calculatedResultSource({ manualOverride: false, instrumentReceived: false })).toBe('manual')
  })
})
