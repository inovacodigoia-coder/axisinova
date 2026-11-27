import { normalizeText, type ResolvedParam } from './examParameters'
import { differentialCell, hematologyNumber, isAbsolute } from './hematologyDifferential'

/** Piloto: só Ielmo Marinho até validar; depois vale para todo aparelho 3 partes. */
export const EMPRESAS_AJUSTE_3_PARTES = ['72a06bac-d540-4280-943c-e9e9006a1b0b']
export const LIMITE_LEUCOCITOS = 9000

const fmt = (n: number) => String(n)

/**
 * Ajuste automático do diferencial (aparelho 3 partes, Leucócitos >= 9.000):
 * Eosinófilos = 1, Monócitos = original − 1 (nunca negativo; a falta sai do maior),
 * demais mantidos; percentuais inteiros fechando 100% (diferença no maior campo).
 * Devolve os percentuais ajustados por id do parâmetro, ou null se a regra não se aplica.
 * Os valores originais do aparelho não são tocados (quem chama continua guardando-os).
 */
export function ajusteDiferencial3Partes(params: ResolvedParam[], instrument: Record<string, string>): Record<string, string> | null {
  const wbc = params.find(p => !differentialCell(p) && /leucocit|\bwbc\b/.test(normalizeText(p.name)))
  let leuco = wbc ? hematologyNumber(instrument[wbc.id]) : null
  if (leuco == null) return null
  if (leuco < 1000) leuco *= 1000 // aparelho envia em mil/mm³ (ex.: 9,5)
  if (leuco < LIMITE_LEUCOCITOS) return null

  const pct = params.filter(p => differentialCell(p) && !isAbsolute(p) && hematologyNumber(instrument[p.id]) != null)
  const hasSeg = pct.some(p => differentialCell(p) === 'segments')
  const cells = pct.filter(p => !(hasSeg && differentialCell(p) === 'neutrophils'))
  const v: Record<string, number> = {}
  for (const p of cells) v[p.id] = Math.floor(hematologyNumber(instrument[p.id])!) // número quebrado: arredonda para baixo
  // Aparelho 3 partes pode não enviar Monócitos/Eosinófilos: o que falta para 100% vira Monócitos (MID).
  const allPct = params.filter(p => differentialCell(p) && !isAbsolute(p))
  const achar = (c: string) => cells.find(p => differentialCell(p) === c) || allPct.find(p => differentialCell(p) === c)
  const eos = achar('eosinophils')
  const mono = achar('monocytes')
  if (!eos || !mono) return null
  if (!cells.includes(mono) || !cells.includes(eos)) {
    const temNeutro = cells.some(p => ['neutrophils', 'segments'].includes(differentialCell(p) as string))
    if (!temNeutro || !cells.some(p => differentialCell(p) === 'lymphocytes')) return null
    if (!cells.includes(eos)) { v[eos.id] = 0; cells.push(eos) }
    if (!cells.includes(mono)) {
      const soma = cells.filter(p => p.id !== mono.id).reduce((s, p) => s + v[p.id], 0)
      v[mono.id] = Math.max(0, 100 - soma); cells.push(mono)
    }
  }
  v[mono.id] = v[mono.id] - 1 // compensa o 1 atribuído ao eosinófilo
  v[eos.id] = 1
  if (v[mono.id] < 0) v[mono.id] = 0
  const maior = () => cells.filter(p => p.id !== eos.id && p.id !== mono.id).sort((a, b) => v[b.id] - v[a.id])[0]
  const total = cells.reduce((s, p) => s + v[p.id], 0)
  const alvo = maior()
  if (alvo && total !== 100) v[alvo.id] = Math.max(0, v[alvo.id] + 100 - total)

  const out: Record<string, string> = {}
  for (const p of cells) out[p.id] = fmt(v[p.id])
  if (hasSeg) {
    const neu = pct.find(p => differentialCell(p) === 'neutrophils')
    if (neu) out[neu.id] = instrument[neu.id]
  }
  return out
}
