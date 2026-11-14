import { METAS_TAT, corDoTat, type Cor, type Prioridade } from './painelOperacional'

/**
 * Relatórios gerenciais do laboratório (abas Produção, Rejeições e Resumo do Dia).
 * TAT = liberação − coleta, as mesmas metas do Painel Operacional. Dias e horas no fuso de São Paulo (UTC−3).
 * Exames de bancadas de apoio ficam fora da produção/TAT (outro fluxo de tempo), mas entram nas rejeições.
 */

const H = 3_600_000
const D = 24 * H
const OFFSET = 3 * H

/** Linha compacta devolvida por lab_relatorio_gerencial. */
export interface LinhaRelatorio {
  o: string; u?: boolean; c?: string; og?: string; e: string; x?: string; b?: string; t?: string
  ca?: string; la?: string; ra?: string; rm?: string; p?: string; n?: string; cb?: string
}

export interface ExameRel {
  chave: string
  orderId: string
  urgente: boolean
  pedidoEm: number | null
  origem: string
  examId: string
  exame: string
  bancadaId: string
  /** Bancada de apoio (ou desconhecida/inativa): fora da produção e do TAT. */
  apoio: boolean
  coletaEm: number | null
  liberadoEm: number | null
  recoletaEm: number | null
  motivo: string | null
  protocolo: string
  paciente: string
  coletador: string
}

const ts = (v?: string | null) => {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : null
}

export function montarExamesRel(linhas: LinhaRelatorio[], bancadasInternas: ReadonlySet<string>): ExameRel[] {
  return linhas.map(l => {
    const bancadaId = l.b || ''
    return {
      chave: `${l.o}:${l.e}`,
      orderId: l.o,
      urgente: !!l.u,
      pedidoEm: ts(l.c),
      origem: l.og || 'Sem origem',
      examId: l.e,
      exame: l.x || 'Exame',
      bancadaId,
      apoio: l.t === 'apoio' || (!!bancadaId && !bancadasInternas.has(bancadaId)),
      coletaEm: ts(l.ca),
      liberadoEm: ts(l.la),
      recoletaEm: ts(l.ra),
      motivo: l.rm || null,
      protocolo: l.p || '',
      paciente: l.n || '',
      coletador: l.cb || '',
    }
  })
}

// ---------- Datas (São Paulo) ----------
export const ymdSP = (t: number) => new Date(t - OFFSET).toISOString().slice(0, 10)
export const inicioDiaSP = (ymd: string) => new Date(`${ymd}T00:00:00-03:00`).getTime()
export const fimDiaSP = (ymd: string) => inicioDiaSP(somarDias(ymd, 1)) - 1
export const horaSP = (t: number) => new Date(t - OFFSET).getUTCHours()
/** 0 = segunda … 6 = domingo. */
export const diaSemanaSP = (t: number) => (new Date(t - OFFSET).getUTCDay() + 6) % 7
export function somarDias(ymd: string, n: number) {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export function mesAnterior(ymdPrimeiro: string) {
  const d = new Date(`${ymdPrimeiro.slice(0, 7)}-01T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - 1)
  return d.toISOString().slice(0, 10)
}
export function diasEntre(inicio: number, fim: number): string[] {
  const out: string[] = []
  const ult = ymdSP(fim)
  for (let d = ymdSP(inicio); d <= ult && out.length < 400; d = somarDias(d, 1)) out.push(d)
  return out
}

export type PeriodoRel = 'hoje' | '7d' | 'mes' | 'mes_anterior' | 'personalizado'
export const MAX_DIAS_PERSONALIZADO = 45

export interface JanelaRel { inicio: number; fim: number; anteriorInicio: number; anteriorFim: number; comparacao: string }

export function janelaRelatorio(p: PeriodoRel, agora: number, custom?: { de: string; ate: string }): JanelaRel {
  const hoje = ymdSP(agora)
  if (p === 'hoje') {
    const inicio = inicioDiaSP(hoje)
    return { inicio, fim: agora, anteriorInicio: inicio - D, anteriorFim: agora - D, comparacao: 'vs ontem' }
  }
  if (p === '7d') {
    const inicio = inicioDiaSP(somarDias(hoje, -6))
    return { inicio, fim: agora, anteriorInicio: inicio - 7 * D, anteriorFim: agora - 7 * D, comparacao: 'vs 7 dias anteriores' }
  }
  const m1 = `${hoje.slice(0, 7)}-01`
  if (p === 'mes') {
    const inicio = inicioDiaSP(m1)
    const anteriorInicio = inicioDiaSP(mesAnterior(m1))
    return { inicio, fim: agora, anteriorInicio, anteriorFim: Math.min(anteriorInicio + (agora - inicio), inicio - 1), comparacao: 'vs mesmo período do mês passado' }
  }
  if (p === 'mes_anterior') {
    const pm1 = mesAnterior(m1)
    return { inicio: inicioDiaSP(pm1), fim: inicioDiaSP(m1) - 1, anteriorInicio: inicioDiaSP(mesAnterior(pm1)), anteriorFim: inicioDiaSP(pm1) - 1, comparacao: 'vs mês anterior' }
  }
  let de = custom?.de || hoje
  let ate = custom?.ate || hoje
  if (ate < de) [de, ate] = [ate, de]
  if (somarDias(de, MAX_DIAS_PERSONALIZADO - 1) < ate) ate = somarDias(de, MAX_DIAS_PERSONALIZADO - 1)
  const inicio = inicioDiaSP(de)
  const fim = Math.min(fimDiaSP(ate), agora)
  const dur = Math.max(1, fim - inicio + 1)
  return { inicio, fim, anteriorInicio: inicio - dur, anteriorFim: inicio - 1, comparacao: 'vs período anterior' }
}

/** Intervalo que precisa ser buscado: período anterior + período + 7 dias das minilinhas. */
export function intervaloDeBusca(j: JanelaRel) {
  return { de: Math.min(j.anteriorInicio, inicioDiaSP(somarDias(ymdSP(j.fim), -6))), ate: j.fim }
}

// ---------- Produção ----------
const dentro = (t: number | null, a: number, b: number) => t !== null && t >= a && t <= b
const media = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)
const prio = (e: ExameRel): Prioridade => (e.urgente ? 'urgente' : 'rotina')

/** TAT em minutos; null se faltar coleta/liberação. */
export function tatRel(e: ExameRel): number | null {
  if (e.liberadoEm === null || e.coletaEm === null || e.liberadoEm < e.coletaEm) return null
  return (e.liberadoEm - e.coletaEm) / 60_000
}
export const noPrazo = (e: ExameRel) => {
  const t = tatRel(e)
  return t !== null && t <= METAS_TAT[prio(e)].vermelho
}

export interface KpisProducao {
  urgRecebidas: number
  urgTat: number | null
  urgNoPrazoPct: number | null
  liberados: number
  porDia: number | null
  rotTat: number | null
  noPrazoPct: number | null
}

/** `exames` já sem apoio e já filtrados por bancada. */
export function kpisProducao(exames: ExameRel[], inicio: number, fim: number): KpisProducao {
  const liberados = exames.filter(e => dentro(e.liberadoEm, inicio, fim))
  const comTat = liberados.filter(e => tatRel(e) !== null)
  const urg = comTat.filter(e => e.urgente)
  const rot = comTat.filter(e => !e.urgente)
  const dias = diasEntre(inicio, fim).length
  return {
    urgRecebidas: exames.filter(e => e.urgente && dentro(e.pedidoEm, inicio, fim)).length,
    urgTat: media(urg.map(e => tatRel(e)!)),
    urgNoPrazoPct: urg.length ? (urg.filter(noPrazo).length / urg.length) * 100 : null,
    liberados: liberados.length,
    porDia: dias ? liberados.length / dias : null,
    rotTat: media(rot.map(e => tatRel(e)!)),
    noPrazoPct: comTat.length ? (comTat.filter(noPrazo).length / comTat.length) * 100 : null,
  }
}

/** Valores diários dos 7 dias que terminam no dia de `fim`. */
export function serie7Dias(exames: ExameRel[], fim: number, valor: (k: KpisProducao) => number | null) {
  const ult = ymdSP(fim)
  return Array.from({ length: 7 }, (_, i) => {
    const dia = somarDias(ult, i - 6)
    return { dia, v: valor(kpisProducao(exames, inicioDiaSP(dia), Math.min(fimDiaSP(dia), fim))) }
  })
}

export type TipoVariacao = 'pct' | 'min' | 'pp' | 'n'
export interface Variacao { texto: string; direcao: 'sobe' | 'desce' | 'igual' }

export function variacao(atual: number | null, anterior: number | null, tipo: TipoVariacao): Variacao | null {
  if (atual === null || anterior === null) return null
  let delta: number
  let texto: string
  if (tipo === 'pct') {
    if (anterior === 0) return null
    delta = ((atual - anterior) / anterior) * 100
    texto = `${Math.abs(delta).toFixed(1).replace('.', ',')}%`
  } else if (tipo === 'pp') {
    delta = atual - anterior
    texto = `${Math.abs(delta).toFixed(1).replace('.', ',')} pp`
  } else if (tipo === 'min') {
    delta = atual - anterior
    texto = `${Math.round(Math.abs(delta))} min`
  } else {
    delta = atual - anterior
    texto = `${Math.abs(delta)}`
  }
  const arred = Math.round(delta * 10) / 10
  return { texto, direcao: arred > 0 ? 'sobe' : arred < 0 ? 'desce' : 'igual' }
}

export const corUrgNoPrazo = (pct: number | null): Cor | null => (pct === null ? null : pct >= 90 ? 'verde' : 'vermelho')

export function volumePorBancada(exames: ExameRel[], inicio: number, fim: number) {
  const m = new Map<string, number>()
  for (const e of exames) if (dentro(e.liberadoEm, inicio, fim)) m.set(e.bancadaId, (m.get(e.bancadaId) || 0) + 1)
  return [...m.entries()].map(([bancadaId, total]) => ({ bancadaId, total })).sort((a, b) => b.total - a.total)
}

export interface LinhaRanking { examId: string; exame: string; bancadaId: string; quantidade: number; tatMedio: number | null }

/** Agrupa por exame (mais frequente primeiro); bancada = a mais comum do exame; TAT só dos liberados. */
export function rankingExames(lista: ExameRel[], limite = 10): LinhaRanking[] {
  const m = new Map<string, { exame: string; n: number; bancadas: Map<string, number>; tats: number[] }>()
  for (const e of lista) {
    const g = m.get(e.examId) || { exame: e.exame, n: 0, bancadas: new Map(), tats: [] }
    g.n++
    g.bancadas.set(e.bancadaId, (g.bancadas.get(e.bancadaId) || 0) + 1)
    const t = tatRel(e)
    if (t !== null) g.tats.push(t)
    m.set(e.examId, g)
  }
  return [...m.entries()]
    .map(([examId, g]) => ({
      examId, exame: g.exame, quantidade: g.n, tatMedio: media(g.tats),
      bancadaId: [...g.bancadas.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.exame.localeCompare(b.exame))
    .slice(0, limite)
}

export const topPedidos = (exames: ExameRel[], inicio: number, fim: number, limite = 10) =>
  rankingExames(exames.filter(e => dentro(e.pedidoEm, inicio, fim)), limite)

export const topDaBancada = (exames: ExameRel[], bancadaId: string, inicio: number, fim: number, limite = 10) =>
  rankingExames(exames.filter(e => e.bancadaId === bancadaId && dentro(e.liberadoEm, inicio, fim)), limite)

export const HORAS_MAPA = Array.from({ length: 17 }, (_, i) => i + 6) // 06h–22h
export const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** Liberações por hora (06–22) × dia da semana; fora dessa faixa não entra no mapa. */
export function mapaCalor(exames: ExameRel[], inicio: number, fim: number) {
  const celulas = HORAS_MAPA.map(() => Array(7).fill(0) as number[])
  let max = 0
  for (const e of exames) {
    if (!dentro(e.liberadoEm, inicio, fim)) continue
    const h = horaSP(e.liberadoEm!)
    if (h < 6 || h > 22) continue
    const v = ++celulas[h - 6][diaSemanaSP(e.liberadoEm!)]
    if (v > max) max = v
  }
  return { celulas, max }
}

// ---------- Rejeições ----------
export const rotuloMotivo = (m: string | null) => m || 'Sem motivo informado'

/** Taxa: vermelho > 1%, amarelo 0,6–1%, verde < 0,6%. */
export function corTaxaRejeicao(taxa: number | null): Cor | null {
  if (taxa === null) return null
  if (taxa > 1) return 'vermelho'
  if (taxa >= 0.6) return 'amarelo'
  return 'verde'
}

function contar<T>(xs: T[], chave: (x: T) => string) {
  const m = new Map<string, number>()
  for (const x of xs) m.set(chave(x), (m.get(chave(x)) || 0) + 1)
  return [...m.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome))
}

/** Rejeição = recoleta pedida no período. Base = exames coletados ou rejeitados no período. */
export function resumoRejeicoes(exames: ExameRel[], inicio: number, fim: number) {
  const lista = exames.filter(e => dentro(e.recoletaEm, inicio, fim)).sort((a, b) => b.recoletaEm! - a.recoletaEm!)
  const base = exames.filter(e => dentro(e.coletaEm, inicio, fim) || dentro(e.recoletaEm, inicio, fim)).length
  const porMotivo = contar(lista, e => rotuloMotivo(e.motivo))
  return {
    lista,
    total: lista.length,
    base,
    taxa: base ? (lista.length / base) * 100 : null,
    porMotivo,
    porOrigem: contar(lista, e => e.origem),
    motivoTop: porMotivo[0] ?? null,
  }
}

// ---------- Resumo do Dia ----------
export interface ResumoDia {
  pedidos: number; pedidosUrg: number; pedidosRot: number
  liberados: number
  urgTat: number | null; rotTat: number | null; urgNoPrazoPct: number | null
  horaPico: { hora: number; total: number } | null
  rejeicoes: number; motivoTop: { nome: string; total: number } | null
  criticos: number
}

/** `exames` = todos (com apoio); `criticos` = horários das notificações de crítico. */
export function resumoDoDia(exames: ExameRel[], ymd: string, criticos: number[]): ResumoDia {
  const ini = inicioDiaSP(ymd), fim = fimDiaSP(ymd)
  const pedidos = new Map<string, { urgente: boolean; em: number }>()
  for (const e of exames) if (dentro(e.pedidoEm, ini, fim)) {
    const p = pedidos.get(e.orderId)
    pedidos.set(e.orderId, { urgente: (p?.urgente ?? false) || e.urgente, em: e.pedidoEm! })
  }
  const porHora = new Map<number, number>()
  for (const p of pedidos.values()) porHora.set(horaSP(p.em), (porHora.get(horaSP(p.em)) || 0) + 1)
  const pico = [...porHora.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]
  const urg = [...pedidos.values()].filter(p => p.urgente).length
  const k = kpisProducao(exames.filter(e => !e.apoio), ini, fim)
  const rej = resumoRejeicoes(exames, ini, fim)
  return {
    pedidos: pedidos.size, pedidosUrg: urg, pedidosRot: pedidos.size - urg,
    liberados: k.liberados, urgTat: k.urgTat, rotTat: k.rotTat, urgNoPrazoPct: k.urgNoPrazoPct,
    horaPico: pico ? { hora: pico[0], total: pico[1] } : null,
    rejeicoes: rej.total, motivoTop: rej.motivoTop,
    criticos: criticos.filter(t => t >= ini && t <= fim).length,
  }
}

const liberadosEntre = (exames: ExameRel[], a: number, b: number) => exames.filter(e => !e.apoio && dentro(e.liberadoEm, a, b)).length

/** Semana (segunda até o dia) vs os mesmos dias da semana passada. */
export function comparativoSemana(exames: ExameRel[], ymd: string) {
  const segunda = somarDias(ymd, -diaSemanaSP(inicioDiaSP(ymd) + 12 * H))
  const ini = inicioDiaSP(segunda), fim = fimDiaSP(ymd)
  return { de: segunda, ate: ymd, atual: liberadosEntre(exames, ini, fim), anterior: liberadosEntre(exames, ini - 7 * D, fim - 7 * D) }
}

/** Liberados por dia do mês: mês do dia (até o dia) e mês anterior inteiro. */
export function comparativoMes(exames: ExameRel[], ymd: string) {
  const m1 = `${ymd.slice(0, 7)}-01`
  const pm1 = mesAnterior(m1)
  const diaAtual = Number(ymd.slice(8, 10))
  const diasPm = Number(somarDias(m1, -1).slice(8, 10))
  const n = 31
  const dias = Array.from({ length: n }, (_, i) => i + 1).map(dia => {
    const dA = `${ymd.slice(0, 7)}-${String(dia).padStart(2, '0')}`
    const dP = `${pm1.slice(0, 7)}-${String(dia).padStart(2, '0')}`
    return {
      dia,
      atual: dia <= diaAtual ? liberadosEntre(exames, inicioDiaSP(dA), fimDiaSP(dA)) : null,
      anterior: dia <= diasPm ? liberadosEntre(exames, inicioDiaSP(dP), fimDiaSP(dP)) : null,
    }
  })
  const totalAtual = dias.reduce((s, d) => s + (d.atual ?? 0), 0)
  const mesmoPeriodoAnterior = dias.filter(d => d.dia <= diaAtual).reduce((s, d) => s + (d.anterior ?? 0), 0)
  return { dias, totalAtual, mesmoPeriodoAnterior }
}

/** Intervalo a buscar para o Resumo do Dia: do 1º dia do mês anterior (ou da semana passada) até o fim do dia. */
export function intervaloResumo(ymd: string) {
  const pm1 = mesAnterior(`${ymd.slice(0, 7)}-01`)
  const segPassada = somarDias(ymd, -diaSemanaSP(inicioDiaSP(ymd) + 12 * H) - 7)
  return { de: inicioDiaSP(pm1 < segPassada ? pm1 : segPassada), ate: fimDiaSP(ymd) }
}

/** Semáforo impresso em texto (sem cor). */
export const SEMAFORO_TEXTO: Record<Cor, string> = { verde: '(OK)', amarelo: '(ATENÇÃO)', vermelho: '(ATRASO)' }
export const semaforoTat = (min: number | null, p: Prioridade) => (min === null ? '' : SEMAFORO_TEXTO[corDoTat(min, p)])
