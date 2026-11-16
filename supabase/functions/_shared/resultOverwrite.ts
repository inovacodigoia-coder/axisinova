// Decisão pura: o que fazer quando chega um resultado novo do aparelho para
// um exame/parâmetro que já tem valor. Regras do laboratório:
// - não liberado → sobrescreve (valor anterior vai para o histórico)
// - liberado → recusa sempre (409 exame_liberado); para retestar, desliberar antes no LIS
// - não liberado com reteste solicitado → grava e consome o reteste (vale por UM resultado);
//   o exame continua não liberado
// - mais recente vence: result_datetime mais antigo que o valor atual → ignored_older
//   (vale também para valor digitado à mão mais recente que o do aparelho)

export type OverwriteDecision =
  | { kind: 'created'; retest: boolean }
  | { kind: 'overwritten'; retest: boolean }
  | { kind: 'ignored_older' }
  | { kind: 'refused_released' }

export interface CurrentValueState {
  value: string | null
  source: string | null // 'instrument' | 'manual'
  /** Último valor intacto do aparelho; diferente de value = técnico alterou à mão */
  instrument_value?: string | null
  result_datetime: string | null
  updated_at: string | null
}

const ts = (v: string | null | undefined): number => {
  if (!v) return 0
  const t = new Date(v).getTime()
  return isNaN(t) ? 0 : t
}

/** Valor digitado ou alterado à mão (inclusive por cima de um valor do aparelho). */
export function editadoAMao(current: CurrentValueState | null): boolean {
  if (!current) return false
  if (current.source !== 'instrument') return true
  const iv = current.instrument_value
  return iv !== null && iv !== undefined && String(iv).trim() !== String(current.value ?? '').trim()
}

export function decideInstrumentResult(opts: {
  examStatus: string
  retestRequested: boolean
  current: CurrentValueState | null
  incomingResultDatetime: string | null
  now?: Date
}): OverwriteDecision {
  const { examStatus, retestRequested, current } = opts

  const hasValue =
    !!current && current.value !== null && current.value !== undefined && String(current.value).trim() !== ''
  // Exame liberado nunca muda pelo aparelho — nem com reteste antigo pendurado
  if (examStatus === 'released') return { kind: 'refused_released' }
  const retest = retestRequested === true
  if (!hasValue) return { kind: 'created', retest }

  const incomingTs = ts(opts.incomingResultDatetime) || (opts.now ?? new Date()).getTime()
  // Valor do aparelho intacto: vale o horário do aparelho. Alterado à mão: vale também
  // o horário da alteração (updated_at), para um resultado antigo reenviado não apagar a correção.
  const currentTs = editadoAMao(current)
    ? Math.max(ts(current!.result_datetime), ts(current!.updated_at))
    : ts(current!.result_datetime) || ts(current!.updated_at)
  if (currentTs && incomingTs < currentTs) return { kind: 'ignored_older' }

  return { kind: 'overwritten', retest }
}
