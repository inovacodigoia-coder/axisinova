import { parseLabNumber } from './resultFlag'

/**
 * Painel Operacional do Bioquímico — regras de TAT, alertas e indicadores.
 * TAT = liberação − coleta; exame ainda não liberado usa agora − coleta (TAT em andamento).
 */

export type Prioridade = 'urgente' | 'rotina'
export type Cor = 'verde' | 'amarelo' | 'vermelho'
export type Alerta = 'atrasado' | 'proximo' | null
export type PeriodoPainel = 'hoje' | 'turno' | '24h' | '7d'

/** Metas em minutos: abaixo de `amarelo` é verde; acima de `vermelho` é vermelho. */
export const METAS_TAT: Record<Prioridade, { amarelo: number; vermelho: number }> = {
  urgente: { amarelo: 30, vermelho: 60 },
  rotina: { amarelo: 60, vermelho: 120 },
}

export function corDoTat(minutos: number, prioridade: Prioridade): Cor {
  const m = METAS_TAT[prioridade]
  if (minutos > m.vermelho) return 'vermelho'
  if (minutos >= m.amarelo) return 'amarelo'
  return 'verde'
}

/** Alerta do pendente: acima da meta vermelha = atrasado; acima da amarela = próximo do limite. */
export function alertaDoPendente(minutos: number, prioridade: Prioridade): Alerta {
  const m = METAS_TAT[prioridade]
  if (minutos > m.vermelho) return 'atrasado'
  if (minutos > m.amarelo) return 'proximo'
  return null
}

export interface LinhaPainelRpc {
  order_id: string
  protocol: string | null
  patient_name: string | null
  is_urgent: boolean | null
  order_status: string | null
  exam_id: string
  exam_name: string | null
  workbench_id: string | null
  bancada_tipo: string | null
  collected_at: string | null
  recollection_at: string | null
  result_status: string | null
  typed_at: string | null
  released_at: string | null
}

export type SituacaoExame = 'coletado' | 'em_analise' | 'digitado' | 'liberado'

export interface ExamePainel {
  chave: string
  orderId: string
  protocolo: string
  paciente: string
  prioridade: Prioridade
  examId: string
  exame: string
  bancadaId: string
  coletaEm: number
  liberadoEm: number | null
  recoletaEm: number | null
  situacao: SituacaoExame
  /** Aguardando nova coleta (recoleta pedida depois da última coleta). */
  aguardandoRecoleta: boolean
}

export const SITUACAO_LABEL: Record<SituacaoExame, string> = {
  coletado: 'Coleta Realizada',
  em_analise: 'Em Análise',
  digitado: 'Digitado (aguardando liberação)',
  liberado: 'Liberado',
}

const ts = (v?: string | null) => {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : null
}

/** Converte as linhas do servidor; descarta exames sem coleta, de apoio ou com coleta programada no futuro. */
export function montarExames(linhas: LinhaPainelRpc[], agora: number, bancadasInternas: ReadonlySet<string>): ExamePainel[] {
  const out: ExamePainel[] = []
  for (const l of linhas) {
    if (l.bancada_tipo === 'apoio') continue
    const bancadaId = l.workbench_id || ''
    if (bancadaId && !bancadasInternas.has(bancadaId)) continue
    const recoletaEm = ts(l.recollection_at)
    const coletaEm = ts(l.collected_at)
    const liberadoEm = l.result_status === 'released' ? ts(l.released_at) : null
    const aguardandoRecoleta = recoletaEm !== null && liberadoEm === null && (coletaEm === null || coletaEm < recoletaEm)
    if (coletaEm === null && recoletaEm === null) continue
    if (coletaEm !== null && coletaEm > agora) continue
    const situacao: SituacaoExame = liberadoEm !== null ? 'liberado'
      : l.result_status === 'digitized' ? 'digitado'
      : l.result_status === 'draft' ? 'em_analise'
      : 'coletado'
    out.push({
      chave: `${l.order_id}:${l.exam_id}`,
      orderId: l.order_id,
      protocolo: l.protocol || '',
      paciente: l.patient_name || '',
      prioridade: l.is_urgent ? 'urgente' : 'rotina',
      examId: l.exam_id,
      exame: l.exam_name || 'Exame',
      bancadaId,
      coletaEm: coletaEm ?? recoletaEm!,
      liberadoEm,
      recoletaEm,
      situacao,
      aguardandoRecoleta,
    })
  }
  return out
}

export const pendente = (e: ExamePainel) => e.liberadoEm === null && !e.aguardandoRecoleta

/** Minutos de TAT: final se liberado, em andamento se não. */
export function tatMinutos(e: ExamePainel, agora: number): number {
  return Math.max(0, ((e.liberadoEm ?? agora) - e.coletaEm) / 60_000)
}

/** Início do dia em São Paulo (UTC−3, sem horário de verão desde 2019). */
export function inicioDoDiaSP(agora: number): number {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(agora))
  return new Date(`${ymd}T00:00:00-03:00`).getTime()
}

const H = 3_600_000

export interface JanelaPeriodo { inicio: number; fim: number; anteriorInicio: number; anteriorFim: number; comparacao: string }

export function janelaDoPeriodo(p: PeriodoPainel, agora: number): JanelaPeriodo {
  if (p === 'hoje') {
    const inicio = inicioDoDiaSP(agora)
    return { inicio, fim: agora, anteriorInicio: inicio - 24 * H, anteriorFim: agora - 24 * H, comparacao: 'vs ontem' }
  }
  const dur = p === 'turno' ? 8 * H : p === '24h' ? 24 * H : 7 * 24 * H
  const comparacao = p === 'turno' ? 'vs turno anterior' : p === '24h' ? 'vs 24h anteriores' : 'vs 7 dias anteriores'
  return { inicio: agora - dur, fim: agora, anteriorInicio: agora - 2 * dur, anteriorFim: agora - dur, comparacao }
}

const dentro = (t: number | null, a: number, b: number) => t !== null && t >= a && t <= b
const media = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

export interface IndicadoresPeriodo {
  /** Liberados no período (TAT final). */
  liberados: ExamePainel[]
  /** Exames que entram na média de TAT: liberados no período + pendentes coletados no período. */
  baseTat: ExamePainel[]
  tatMedio: number | null
  /** % dos liberados no período sem passar da meta vermelha. */
  noPrazoPct: number | null
  noPrazo: ExamePainel[]
  rejeicoes: ExamePainel[]
  coletadosNoPeriodo: number
}

export function indicadoresDoPeriodo(exames: ExamePainel[], prioridade: Prioridade, inicio: number, fim: number, agora: number): IndicadoresPeriodo {
  const daPrioridade = exames.filter(e => e.prioridade === prioridade)
  const liberados = daPrioridade.filter(e => dentro(e.liberadoEm, inicio, fim))
  const emAndamento = fim >= agora ? daPrioridade.filter(e => pendente(e) && dentro(e.coletaEm, inicio, fim)) : []
  const baseTat = [...liberados, ...emAndamento]
  const noPrazo = liberados.filter(e => tatMinutos(e, agora) <= METAS_TAT[prioridade].vermelho)
  return {
    liberados,
    baseTat,
    tatMedio: media(baseTat.map(e => tatMinutos(e, agora))),
    noPrazoPct: liberados.length ? (noPrazo.length / liberados.length) * 100 : null,
    noPrazo,
    rejeicoes: daPrioridade.filter(e => dentro(e.recoletaEm, inicio, fim)),
    coletadosNoPeriodo: daPrioridade.filter(e => dentro(e.coletaEm, inicio, fim)).length,
  }
}

/** Ordem do backlog: urgências atrasadas → urgências no prazo → rotina atrasada → rotina no prazo; mais antigo primeiro. */
export function ordenarBacklog(exames: ExamePainel[], agora: number): ExamePainel[] {
  const grupo = (e: ExamePainel) => {
    const atrasado = alertaDoPendente(tatMinutos(e, agora), e.prioridade) === 'atrasado'
    return (e.prioridade === 'urgente' ? 0 : 2) + (atrasado ? 0 : 1)
  }
  return [...exames].sort((a, b) => grupo(a) - grupo(b) || a.coletaEm - b.coletaEm)
}

const PESO: Record<Cor, number> = { verde: 0, amarelo: 1, vermelho: 2 }

/** Cor da bancada: o pior pendente (cada um pela sua meta); sem pendentes, o TAT médio pela meta de rotina. */
export function corDaBancada(pendentes: ExamePainel[], tatMedio: number | null, agora: number): Cor {
  if (!pendentes.length) return tatMedio === null ? 'verde' : corDoTat(tatMedio, 'rotina')
  return pendentes.reduce<Cor>((pior, e) => {
    const c = corDoTat(tatMinutos(e, agora), e.prioridade)
    return PESO[c] > PESO[pior] ? c : pior
  }, 'verde')
}

export function formatarDuracao(min: number | null): string {
  if (min === null || !Number.isFinite(min)) return '—'
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h ${String(r).padStart(2, '0')}min`
}

/**
 * Limite crítico cadastrado no mapeamento do equipamento. Formatos aceitos (vírgula ou ponto):
 * "< 2,5", "> 7", "<= 40", "2,5 - 7,0" / "2,5 a 7,0" (crítico fora da faixa),
 * vários separados por ";" ou "|", e número sozinho = crítico a partir dele (≥).
 */
export function valorCritico(valor: string, limite: string): boolean {
  const v = parseLabNumber(String(valor ?? '').replace(/^[<>]=?\s*/, ''))
  if (!Number.isFinite(v)) return false
  return String(limite || '').split(/[;|]/).map(s => s.trim()).filter(Boolean).some(regra => {
    const faixa = regra.match(/^(\d+(?:[.,]\d+)*)\s*(?:-|–|a|at[ée])\s*(\d+(?:[.,]\d+)*)$/i)
    if (faixa) {
      const lo = parseLabNumber(faixa[1]), hi = parseLabNumber(faixa[2])
      return v < Math.min(lo, hi) || v > Math.max(lo, hi)
    }
    const op = regra.match(/^(<=|>=|≤|≥|<|>)\s*(.+)$/)
    if (op) {
      const n = parseLabNumber(op[2])
      if (!Number.isFinite(n)) return false
      if (op[1] === '<') return v < n
      if (op[1] === '<=' || op[1] === '≤') return v <= n
      if (op[1] === '>') return v > n
      return v >= n
    }
    const n = parseLabNumber(regra)
    return Number.isFinite(n) && v >= n
  })
}
