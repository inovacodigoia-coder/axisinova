import { referenceModeOf } from './examReferenceMode'

/**
 * Sinalização Alto/Baixo do resultado.
 *
 * - Número: "2,66" e "2.66" são o mesmo valor; "7.500" e "150.000" são milhar.
 *   Valor e referência usam a mesma leitura, então ficam sempre coerentes.
 * - Referência completa: quando o texto mostrado tem UMA faixa clara
 *   ("2,2 - 2,9 mmol/L", "< 190", "> 40"), é ela que decide — assim o laudo
 *   nunca marca Baixo um valor que está dentro da faixa impressa. Texto com
 *   tabela (várias faixas) continua usando as faixas por idade/sexo.
 */
export type ResultFlag = 'Alto' | 'Baixo' | 'Normal' | ''

const NUM = /\d+(?:[.,]\d+)*/g

export function parseLabNumber(raw: string): number {
  const s = String(raw ?? '').trim().replace(/\s+/g, '')
  if (!s) return NaN
  const m = s.match(/^[+-]?\d+(?:[.,]\d+)*/)
  if (!m) return NaN
  let t = m[0]
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.')
  } else if (/^[+-]?[1-9]\d{0,2}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '')
  }
  return parseFloat(t)
}

/** Faixa única contida no texto da referência completa, ou '' se não houver. */
export function singleRangeFromText(text: string): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  const nums = clean.match(NUM) || []
  if (nums.length === 2) {
    const r = clean.match(/(\d+(?:[.,]\d+)*)\s*(?:-|–|—|a|at[ée])\s*(\d+(?:[.,]\d+)*)/i)
    if (r) return `${r[1]} a ${r[2]}`
  }
  if (nums.length === 1) {
    const lt = clean.match(/(?:<=?|≤|menor\s+(?:ou\s+igual\s+)?(?:que|a)|inferior\s+a|at[ée])\s*(\d+(?:[.,]\d+)*)/i)
    if (lt) return `< ${lt[1]}`
    const gt = clean.match(/(?:>=?|≥|maior\s+(?:ou\s+igual\s+)?(?:que|a)|superior\s+a|acima\s+de)\s*(\d+(?:[.,]\d+)*)/i)
    if (gt) return `> ${gt[1]}`
  }
  return ''
}

/** Referência usada para marcar Alto/Baixo de um parâmetro. */
export function flagReference(param: any, simpleRef: string): string {
  if (referenceModeOf(param) === 'completa') {
    const single = singleRangeFromText(param.referenceFullText)
    if (single) return single
  }
  return simpleRef
}

export function resultFlag(value: string, reference: string): ResultFlag {
  if (!value || !reference) return ''
  const v = parseLabNumber(value)
  if (isNaN(v)) return ''
  const ref = String(reference).replace(/\s+/g, ' ').trim()

  const range = ref.match(/(\d+(?:[.,]\d+)*)\s*(?:-|–|—|\ba\b|at[ée])\s*(\d+(?:[.,]\d+)*)/i)
  if (range) {
    const min = parseLabNumber(range[1])
    const max = parseLabNumber(range[2])
    if (v < min) return 'Baixo'
    if (v > max) return 'Alto'
    return 'Normal'
  }
  const lt = ref.match(/(?:<=?|≤|menor\s+que)\s*(\d+(?:[.,]\d+)*)/i)
  if (lt) return v > parseLabNumber(lt[1]) ? 'Alto' : 'Normal'
  const gt = ref.match(/(?:>=?|≥|maior\s+que)\s*(\d+(?:[.,]\d+)*)/i)
  if (gt) return v < parseLabNumber(gt[1]) ? 'Baixo' : 'Normal'

  const parts = ref.match(NUM)
  if (parts && parts.length >= 2) {
    if (v < parseLabNumber(parts[0])) return 'Baixo'
    if (v > parseLabNumber(parts[1])) return 'Alto'
  }
  return 'Normal'
}
