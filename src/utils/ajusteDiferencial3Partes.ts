import { normalizeText, type ResolvedParam } from './examParameters'
import { differentialCell, hematologyNumber, isAbsolute } from './hematologyDifferential'

/**
 * Diferencial estimada de contador 3 partes (ligada por empresa em lab_settings.hemo3p_estimativa_ativa).
 * Vale só quando NÃO há lâmina: Leucócitos < limite e MID % < limite de MID.
 * Linf = Linf% do aparelho; Seg = Granulócitos%; Mono = MID% − 1; Eos = 1; Baso = 0; Bastonetes vazio.
 * Inteiros pelo maior resto somando 100. Absolutos ficam com a fórmula do parâmetro.
 */
export type Config3Partes = { limiteLeucocitos: number; limiteMid: number }
export type Resultado3Partes =
  | { status: 'aplicado'; valores: Record<string, string> }
  | { status: 'mid_alto' }
  | null

/** Maior resto: arredonda para inteiros que somam exatamente `alvo`. */
export function maiorResto(v: number[], alvo: number): number[] {
  const base = v.map(x => Math.floor(Math.max(0, x)))
  let falta = alvo - base.reduce((s, x) => s + x, 0)
  const ordem = v.map((x, i) => ({ i, r: Math.max(0, x) - Math.floor(Math.max(0, x)) })).sort((a, b) => b.r - a.r || v[b.i] - v[a.i])
  for (let k = 0; falta > 0; k = (k + 1) % ordem.length, falta--) base[ordem[k].i]++
  for (let k = 0; falta < 0; falta++) { // sobra: tira do maior
    k = base.indexOf(Math.max(...base)); base[k]--
  }
  return base
}

export function ajusteDiferencial3Partes(
  params: ResolvedParam[],
  instrument: Record<string, string>,
  ocultos: { midPct?: string; granPct?: string },
  cfg: Config3Partes,
): Resultado3Partes {
  const wbc = params.find(p => !differentialCell(p) && /leucocit|\bwbc\b/.test(normalizeText(p.name)))
  let leuco = wbc ? hematologyNumber(instrument[wbc.id]) : null
  const pct = (c: string) => params.find(p => differentialCell(p) === c && !isAbsolute(p))
  const linfP = pct('lymphocytes')
  const segP = pct('segments') || pct('neutrophils')
  const monoP = pct('monocytes'), eosP = pct('eosinophils'), basoP = pct('basophils')
  const linf = linfP ? hematologyNumber(instrument[linfP.id]) : null
  const mid = hematologyNumber(ocultos.midPct)
  const gran = hematologyNumber(ocultos.granPct)
  if (leuco == null || linf == null || mid == null || gran == null || !segP || !monoP || !eosP) return null
  if (leuco < 1000) leuco *= 1000
  if (leuco >= cfg.limiteLeucocitos) return null // caso de lâmina
  if (mid >= cfg.limiteMid) return { status: 'mid_alto' }
  let l: number, s: number, m: number
  if (Math.round(mid) <= 1) {
    ;[l, s] = maiorResto([linf, gran], 100)
    if (l >= s) l--; else s--
    m = 0
  } else {
    ;[l, s, m] = maiorResto([linf, gran, mid - 1], 99)
  }
  const valores: Record<string, string> = { [linfP.id]: String(l), [segP.id]: String(s), [monoP.id]: String(m), [eosP.id]: '1' }
  if (basoP) valores[basoP.id] = '0'
  return { status: 'aplicado', valores }
}
