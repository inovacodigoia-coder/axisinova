import { formatarPrevisao } from './previsaoColeta'

type ExameAnalise = {
  collected?: boolean
  isColeta?: boolean
  collectedAt?: string | null
  status?: string | null
  coletaProgramada?: boolean
}

const STATUS_JA_TRABALHADOS = ['digitized', 'released', 'liberado', 'validated', 'retificado']

/** A data futura não retira o exame da Análise; apenas coleta cancelada/ausente o faz. */
export function exameDisponivelParaAnalise(exame: ExameAnalise, pedidoColetado: boolean): boolean {
  const jaTrabalhado = STATUS_JA_TRABALHADOS.includes(String(exame.status || '').toLowerCase())
  const coletado = exame.collected === false
    ? false
    : Boolean(exame.collected || exame.isColeta || exame.collectedAt || pedidoColetado)
  return coletado || jaTrabalhado
}

/** Datas das coletas alteradas do pedido, sem repetição e na ordem cronológica. */
export function coletasAlteradas(exames: ExameAnalise[]): string[] {
  const timestamps = new Set<number>()
  for (const exame of exames) {
    if (!exame.coletaProgramada || !exame.collectedAt) continue
    const timestamp = new Date(exame.collectedAt).getTime()
    if (!Number.isNaN(timestamp)) timestamps.add(timestamp)
  }
  return [...timestamps].sort((a, b) => a - b).map(timestamp => new Date(timestamp).toISOString())
}

export function textoColetaAlterada(data: string): string {
  return `Coleta alterada: ${formatarPrevisao(data)}`
}
