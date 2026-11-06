import { normalizeText, type ResolvedParam } from './examParameters'

export type DifferentialType = '3' | '5' | null
type Cell = 'neutrophils' | 'segments' | 'bands' | 'lymphocytes' | 'monocytes' | 'eosinophils' | 'basophils' | 'mid' | 'granulocytes' | 'other'

export function differentialCell(p: { name?: string; parameterName?: string; code?: string }): Cell | null {
  const n = normalizeText(p.name || p.parameterName)
  if (/granul/.test(n) && !/imatur/.test(n)) return 'granulocytes'
  if (/\bmid\b/.test(n)) return 'mid'
  if (/baston|bastao|bastoes/.test(n)) return 'bands'
  if (/segment/.test(n)) return 'segments'
  if (/neutro/.test(n)) return 'neutrophils'
  if (/linfo|lymph/.test(n)) return 'lymphocytes'
  if (/monoc/.test(n)) return 'monocytes'
  if (/eosino/.test(n)) return 'eosinophils'
  if (/basof/.test(n)) return 'basophils'
  if (/blasto|mieloc|celulas jovens|gran.*imatur/.test(n)) return 'other'
  return null
}

export const isAbsolute = (p: { name?: string; parameterName?: string; unit?: string }) => /absolut|\babs\b/.test(normalizeText(p.name || p.parameterName)) || (!!p.unit && !p.unit.includes('%') && /mm|µ|ul/i.test(p.unit))
export function hematologyNumber(value?: string): number | null {
  let s = String(value ?? '').trim().replace(/\s/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
/**
 * Regra única da diferencial (vale para todo aparelho, 3 ou 5 partes):
 * - O valor recebido do aparelho é imutável e prevalece.
 * - Nenhum campo da diferencial é calculado aqui: absolutos e índices só são
 *   calculados pela FÓRMULA do parâmetro (CALC), no motor evaluateFormula.
 * - Bastonete nunca é derivado de outro campo; segmentado nunca é
 *   "neutrófilo do aparelho − bastonete" (isso mistura lâmina com aparelho).
 * - Diferencial manual (lâmina) substitui a diferencial INTEIRA do aparelho:
 *   se qualquer percentual foi digitado, a soma tem que fechar 100% —
 *   caso contrário a liberação é bloqueada (blockRelease).
 * - Soma do aparelho diferente de 100% por arredondamento: só aviso (warning).
 */
export function resolveDifferential(params: ResolvedParam[], values: Record<string, string>, instrument: Record<string, string>) {
  const next = { ...values }
  // Valores do aparelho são a entrada imutável da diferencial.
  for (const p of params) {
    if (!differentialCell(p)) continue
    if (instrument[p.id] != null) next[p.id] = instrument[p.id]
  }
  const segments = params.find(p => differentialCell(p) === 'segments' && !isAbsolute(p))
  const hasSegments = !!segments && hematologyNumber(next[segments.id]) != null
  const relatives = params.filter(p => differentialCell(p) && !isAbsolute(p) && !(hasSegments && differentialCell(p) === 'neutrophils'))
  const manual = relatives.some(p => next[p.id]?.trim() && instrument[p.id] == null)
  const total = relatives.reduce((sum, p) => sum + (hematologyNumber(next[p.id]) ?? 0), 0)
  const off = total > 0 && Math.abs(total - 100) > 0.05
  return { values: next, total, manual, warning: !manual && off, blockRelease: manual && off }
}

export function hematologyReady(params: ResolvedParam[], valueOf: (id: string) => string) {
  const hemogram = params.some(p => /leucocit|\bwbc\b/.test(normalizeText(p.name))) && params.some(p => differentialCell(p))
  const required = hemogram ? params.filter(p => !differentialCell(p)) : params
  return params.length > 0 && required.every(p => valueOf(p.id).trim() !== '')
}

/** Only presentation changes; unspecified devices retain every row. */
export function differentialReportRows<T extends { parameterName?: string; name?: string }>(rows: T[], type?: string | null): T[] {
  if (type === '5') return rows.filter(p => !['mid', 'granulocytes'].includes(differentialCell(p) || ''))
  if (type === '3') return rows.filter(p => !['neutrophils', 'segments', 'bands', 'monocytes', 'eosinophils', 'basophils', 'other'].includes(differentialCell(p) || ''))
  return rows
}