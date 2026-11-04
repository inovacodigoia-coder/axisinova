// Decisão pura: o que fazer quando chega um resultado novo do aparelho para
// um exame/parâmetro que já tem valor. Regras do laboratório:
// - não liberado → sobrescreve (valor anterior vai para o histórico)
// - liberado sem reteste → recusa (409 exame_liberado)
// - liberado com reteste solicitado → sobrescreve e reabre o exame
// - mais recente vence: result_datetime mais antigo que o valor atual → ignored_older
//   (vale também para valor digitado à mão mais recente que o do aparelho)

export type OverwriteDecision =
  | { kind: 'created' }
  | { kind: 'overwritten'; reopened: boolean }
  | { kind: 'ignored_older' }
  | { kind: 'refused_released' }

export interface CurrentValueState {
  value: string | null
  source: string | null // 'instrument' | 'manual'
  result_datetime: string | null
  updated_at: string | null
}

const ts = (v: string | null | undefined): number => {
  if (!v) return 0
  const t = new Date(v).getTime()
  return isNaN(t) ? 0 : t
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
  if (!hasValue) return { kind: 'created' }

  if (examStatus === 'released' && !retestRequested) return { kind: 'refused_released' }

  const incomingTs = ts(opts.incomingResultDatetime) || (opts.now ?? new Date()).getTime()
  const currentTs = ts(current!.result_datetime) || ts(current!.updated_at)
  if (currentTs && incomingTs < currentTs) return { kind: 'ignored_older' }

  return { kind: 'overwritten', reopened: examStatus === 'released' }
}
