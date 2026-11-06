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
const decimal = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')

/** Raw instrument values are immutable inputs, separate from the edited differential. */
export function resolveDifferential(params: ResolvedParam[], values: Record<string, string>, instrument: Record<string, string>) {
  const next = { ...values }
  const pct = (cell: Cell) => params.find(p => differentialCell(p) === cell && !isAbsolute(p))
  const bands = pct('bands')
  const segments = pct('segments')
  const neutrophils = pct('neutrophils')
  const neutSource = [neutrophils, segments].find(p => p && hematologyNumber(instrument[p.id]) != null)
  const bandValue = bands ? hematologyNumber(values[bands.id]) : null
  const hasManualBands = !!bands && bandValue != null && instrument[bands.id] == null
  if (segments && neutSource && hasManualBands) {
    const neut = hematologyNumber(instrument[neutSource.id])
    if (neut != null && bandValue != null) next[segments.id] = decimal(neut - bandValue)
  } else if (segments && instrument[segments.id] != null) next[segments.id] = instrument[segments.id]

  const wbc = params.find(p => /leucocit|\bwbc\b/.test(normalizeText(p.name)))
  let totalWbc = wbc ? hematologyNumber(next[wbc.id]) : null
  if (totalWbc != null && /10\s*\^?\s*3|10³/.test(wbc?.unit || '')) totalWbc *= 1000
  for (const p of params) {
    const cell = differentialCell(p)
    if (!cell || !isAbsolute(p)) continue
    // Received absolute counts are never balanced or replaced by a calculation.
    if (instrument[p.id] != null) { next[p.id] = instrument[p.id]; continue }
    const relative = pct(cell)
    const percent = relative ? hematologyNumber(next[relative.id]) : null
    if (totalWbc != null && percent != null && (p.isCalculated || !next[p.id]?.trim())) next[p.id] = String(Math.round(percent * totalWbc / 100))
    else if (p.isCalculated && percent == null) next[p.id] = ''
  }
  const hasSegments = !!segments && hematologyNumber(next[segments.id]) != null
  const relatives = params.filter(p => differentialCell(p) && !isAbsolute(p) && !(hasSegments && differentialCell(p) === 'neutrophils'))
  const manual = relatives.some(p => next[p.id]?.trim() && instrument[p.id] == null)
  const total = relatives.reduce((sum, p) => sum + (hematologyNumber(next[p.id]) ?? 0), 0)
  return { values: next, total, warning: manual && Math.abs(total - 100) > 0.05, hasManualBands }
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