export const MANUAL_CALCULATED_SOURCE = 'manual_override'

interface CalculatedParam {
  isCalculated?: boolean
  preferFormula?: boolean
}

/** A fórmula só deixa de prevalecer por uma edição manual explícita pela caneta. */
export function shouldCalculateAutomatically(
  param: CalculatedParam,
  options: { instrumentReceived?: boolean; manualOverride?: boolean },
): boolean {
  return !!param.isCalculated && !options.manualOverride && (!options.instrumentReceived || !!param.preferFormula)
}

/** O valor manual pode ser deliberadamente vazio; nesse caso a fórmula não é chamada. */
export function calculatedResultValue(options: {
  param: CalculatedParam
  storedValue?: string | null
  instrumentReceived?: boolean
  manualOverride?: boolean
  calculate: () => string
}): string {
  const stored = options.storedValue ?? ''
  if (!shouldCalculateAutomatically(options.param, options)) return stored
  return options.calculate()
}

/** Marca no resultado que o valor (inclusive vazio) foi escolhido manualmente. */
export function calculatedResultSource(options: { instrumentReceived?: boolean; manualOverride?: boolean }): string {
  if (options.manualOverride) return MANUAL_CALCULATED_SOURCE
  return options.instrumentReceived ? 'instrument' : 'manual'
}

export function isManualCalculatedSource(source?: string | null): boolean {
  return source === MANUAL_CALCULATED_SOURCE
}
