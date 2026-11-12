/**
 * Campo "Valor" dos Parâmetros do Exame: quando ativo e preenchido, a
 * Digitação de Resultados já abre o campo com esse resultado.
 * Fica no JSON dos parâmetros (exams/exam_laudos): defaultValueEnabled + defaultValue.
 */
export function defaultResultValue(param: any): string {
  if (!param) return ''
  const enabled = !!(param.defaultValueEnabled ?? param.default_value_enabled)
  if (!enabled) return ''
  return String(param.defaultValue ?? param.default_value ?? '').trim()
}

/**
 * Valores a pré-preencher num exame. Só exame sem resultado salvo recebe o
 * valor, e só nos campos vazios — nada que veio do aparelho, do apoio ou foi
 * digitado é substituído. CALC não recebe (vem da fórmula).
 */
export function defaultResultUpdates(args: {
  examId: string
  params: any[]
  results: Record<string, string>
  hasSavedResult: boolean
  released?: boolean
}): Record<string, string> {
  const { examId, params, results, hasSavedResult, released } = args
  if (hasSavedResult || released) return {}
  const updates: Record<string, string> = {}
  for (const p of params || []) {
    if (p?.isCalculated) continue
    const value = p?.defaultValue ?? ''
    if (!value) continue
    const key = `${examId}_${p.id}`
    if ((results[key] || '').trim()) continue
    updates[key] = value
  }
  return updates
}

/** Exame cujo único conteúdo são valores padrão intocados não vira rascunho. */
export function onlyUntouchedDefaults(args: {
  examId: string
  params: any[]
  results: Record<string, string>
  defaults: Record<string, string>
}): boolean {
  const { examId, params, results, defaults } = args
  let anyValue = false
  for (const p of params || []) {
    const key = `${examId}_${p.id}`
    const v = (results[key] || '').trim()
    if (!v) continue
    anyValue = true
    if (defaults[key] === undefined || defaults[key] !== v) return false
  }
  return anyValue
}
