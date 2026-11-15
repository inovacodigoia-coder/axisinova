// =====================================================================
// Soroteca — regras de tela (posições, cores, prioridade de descarte,
// tubos do pedido e linha do tempo). Gravação só pelas RPCs soroteca_*.
// =====================================================================
import { etiquetasDosExames, examesDoTubo, descricaoEtiqueta } from '@/lib/tubos'
import { buildSampleCode, generateSampleHash } from '@/utils/orderHash'

export type StatusResultado = 'liberado' | 'parcial' | 'em_analise'
export type Situacao = 'armazenada' | 'retirada' | 'descartada'
export type Prioridade = 'urgente' | 'atencao' | 'planejado'

const DIA = 86_400_000

export interface EquipamentoSoroteca {
  id: string
  nome: string
  tipo: 'geladeira' | 'freezer' | 'estante' | 'outro'
  temperatura: string | null
  workbench_id: string | null
  bancada_nome: string | null
  linhas: number
  colunas: number
  ativo: boolean
  ocupadas: number
}

export interface AmostraSoroteca {
  id: string
  codigo_amostra: string
  codigo_alfanumerico: string
  order_id: string
  tubo_indice: number
  protocolo: string | null
  patient_name: string | null
  workbench_id: string | null
  bancada_nome: string | null
  tubo_nome: string | null
  exames_nomes: string[]
  tem_apoio: boolean
  coletada_em: string | null
  validade: string | null
  status: Situacao
  equipamento_id: string | null
  equipamento_nome: string | null
  linha: number | null
  coluna: number | null
  armazenada_em: string | null
  descartada_em: string | null
  total: number
  liberados: number
  status_resultado: StatusResultado
}

export const TIPOS_EQUIPAMENTO: { value: EquipamentoSoroteca['tipo']; label: string }[] = [
  { value: 'geladeira', label: 'Geladeira' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'estante', label: 'Estante' },
  { value: 'outro', label: 'Outro' },
]

export const MOTIVOS_RETIRADA = ['Recoleta solicitada', 'Consulta externa', 'Exame complementar', 'Descarte antecipado', 'Outro'] as const
export const MOTIVOS_DESCARTE = ['Validade vencida', 'Prazo de retenção atingido', 'Descarte de rotina', 'Amostra danificada', 'Outro'] as const

/** Linha 1 = A … 26 = Z, 27 = AA … 52 = AZ. */
export function letraLinha(n: number): string {
  if (n < 1) return '?'
  return n <= 26 ? String.fromCharCode(64 + n) : `A${String.fromCharCode(64 + n - 26)}`
}

/** "A05" */
export const rotuloPosicao = (linha: number, coluna: number) => `${letraLinha(linha)}${String(coluna).padStart(2, '0')}`
export const chavePosicao = (linha: number, coluna: number) => `${linha}:${coluna}`

/** Mesma regra do banco (soroteca__status). */
export function statusResultado(total: number, liberados: number): StatusResultado {
  if (total > 0 && liberados >= total) return 'liberado'
  if (liberados > 0) return 'parcial'
  return 'em_analise'
}

export const STATUS_LABEL: Record<StatusResultado, string> = { liberado: 'Liberado', parcial: 'Parcial', em_analise: 'Em análise' }

/** Grade grande (> 200 posições) aparece comprimida no dashboard. */
export const gradeComprimida = (linhas: number, colunas: number) => linhas * colunas > 200

/** Dias inteiros até a validade (negativo = vencida). */
export function diasRestantes(validade: string | null, agora: number = Date.now()): number | null {
  if (!validade) return null
  const t = new Date(validade).getTime()
  if (Number.isNaN(t)) return null
  return Math.floor((t - agora) / DIA)
}

/** Vermelho se vencida, laranja se vence dentro do aviso (padrão 7 dias). */
export function alertaValidade(validade: string | null, avisoDias = 7, agora: number = Date.now()): 'vencida' | 'vencendo' | null {
  if (!validade) return null
  const t = new Date(validade).getTime()
  if (t < agora) return 'vencida'
  if (t <= agora + avisoDias * DIA) return 'vencendo'
  return null
}

/**
 * Prioridade do descarte: urgente = vencida há mais de 24 h; atenção = vence dentro do
 * aviso (padrão 7 dias, inclui vencidas há menos de 24 h); planejado = vence em até 30 dias.
 */
export function prioridadeDescarte(validade: string | null, avisoDias = 7, agora: number = Date.now()): Prioridade | null {
  if (!validade) return null
  const t = new Date(validade).getTime()
  if (Number.isNaN(t)) return null
  if (t < agora - DIA) return 'urgente'
  if (t <= agora + avisoDias * DIA) return 'atencao'
  if (t <= agora + 30 * DIA) return 'planejado'
  return null
}

export const PRIORIDADE_ORDEM: Record<Prioridade, number> = { urgente: 0, atencao: 1, planejado: 2 }

/** Primeira posição livre, linha por linha (A01, A02, … B01 …). */
export function primeiraLivre(linhas: number, colunas: number, ocupadas: ReadonlySet<string>): { linha: number; coluna: number } | null {
  for (let l = 1; l <= linhas; l++) {
    for (let c = 1; c <= colunas; c++) if (!ocupadas.has(chavePosicao(l, c))) return { linha: l, coluna: c }
  }
  return null
}

/** Ocupadas de um equipamento (opcionalmente somando posições já reservadas no lote). */
export function ocupadasDo(equipamentoId: string, amostras: AmostraSoroteca[], reservas: { equipamento_id: string; linha: number; coluna: number }[] = []) {
  const s = new Set<string>()
  for (const a of amostras) if (a.status === 'armazenada' && a.equipamento_id === equipamentoId && a.linha && a.coluna) s.add(chavePosicao(a.linha, a.coluna))
  for (const r of reservas) if (r.equipamento_id === equipamentoId) s.add(chavePosicao(r.linha, r.coluna))
  return s
}

/**
 * Sugestão de posição: equipamento ativo da mesma bancada do tubo com vaga; senão um
 * equipamento sem bancada definida; senão qualquer ativo com vaga.
 */
export function sugerirPosicao(
  equipamentos: EquipamentoSoroteca[],
  amostras: AmostraSoroteca[],
  workbenchId: string | null,
  reservas: { equipamento_id: string; linha: number; coluna: number }[] = [],
): { equipamento_id: string; linha: number; coluna: number } | null {
  const ativos = equipamentos.filter(e => e.ativo)
  const grupos = [
    ativos.filter(e => workbenchId && e.workbench_id === workbenchId),
    ativos.filter(e => !e.workbench_id),
    ativos,
  ]
  for (const g of grupos) {
    for (const e of g) {
      const p = primeiraLivre(e.linhas, e.colunas, ocupadasDo(e.id, amostras, reservas))
      if (p) return { equipamento_id: e.id, ...p }
    }
  }
  return null
}

export const primeiroNome = (nome: string | null | undefined) => String(nome || '').trim().split(/\s+/)[0] || ''

// ----------------------------- Tubos do pedido -----------------------------

export interface PedidoLocalizado {
  order_id: string
  protocolo: string
  empresa_seq: number | null
  patient_id: string | null
  patient_name: string | null
  patient_birth: string | null
  is_urgent: boolean
  created_at: string
  lab_guides: any[]
  tubo_indice: number | null
  resultados: Record<string, string>
  guardados: { id: string; tubo_indice: number; codigo_amostra: string; status: Situacao; equipamento_id: string | null; equipamento_nome: string | null; linha: number | null; coluna: number | null }[]
}

export interface TuboDoPedido {
  indice: number
  codigo: string
  hash: string
  nome: string
  exameIds: string[]
  examesNomes: string[]
  internos: number
  temApoio: boolean
  soApoio: boolean
  coletado: boolean
  bancadaId: string | null
  bancadaNome: string | null
  total: number
  liberados: number
  status: StatusResultado
  guardado: PedidoLocalizado['guardados'][number] | null
}

const idDoExame = (e: any) => String(e?.examId ?? e?.id ?? '')
const ehApoio = (e: any) => e?.bancadaTipo === 'apoio'
const coletadoAgora = (e: any, agora: number) => {
  if (!e || e.collected === false || !e.collectedAt) return false
  const t = new Date(e.collectedAt).getTime()
  return !Number.isNaN(t) && t <= agora + 5 * 60_000
}

/**
 * Tubos do pedido na mesma ordem/código das etiquetas impressas (etiquetasDosExames +
 * buildSampleCode). Exames de apoio não contam no status; tubo só de apoio não entra.
 */
export function tubosDoPedido(p: PedidoLocalizado, agora: number = Date.now()): TuboDoPedido[] {
  const exams: any[] = (p.lab_guides || []).flatMap((g: any) => g?.exams || [])
  return etiquetasDosExames(exams).map((tube, idx) => {
    const indice = idx + 1
    const codigo = buildSampleCode(p.protocolo, indice, p.empresa_seq)
    const lista = examesDoTubo(exams, tube)
    const internos = lista.filter(e => !ehApoio(e))
    const contagem = new Map<string, { n: number; nome: string | null }>()
    for (const e of internos) {
      const k = String(e.bancadaId || e.workbenchId || '')
      if (!k) continue
      const cur = contagem.get(k) || { n: 0, nome: e.bancadaNome || null }
      contagem.set(k, { n: cur.n + 1, nome: cur.nome || e.bancadaNome || null })
    }
    const top = [...contagem.entries()].sort((a, b) => b[1].n - a[1].n)[0]
    let total = 0
    let liberados = 0
    for (const e of internos) {
      const st = p.resultados?.[idDoExame(e)]
      if (st === 'cancelled') continue
      total++
      if (st === 'released') liberados++
    }
    return {
      indice,
      codigo,
      hash: generateSampleHash(codigo),
      nome: descricaoEtiqueta(tube),
      exameIds: [...new Set(lista.map(idDoExame).filter(Boolean))],
      examesNomes: lista.map(e => String(e.name || e.examName || '')),
      internos: internos.length,
      temApoio: lista.some(ehApoio),
      soApoio: lista.length > 0 && internos.length === 0,
      coletado: internos.some(e => coletadoAgora(e, agora)),
      bancadaId: top?.[0] ?? null,
      bancadaNome: top?.[1].nome ?? null,
      total,
      liberados,
      status: statusResultado(total, liberados),
      guardado: (p.guardados || []).find(g => g.tubo_indice === indice) ?? null,
    }
  })
}

/** Motivo para não deixar guardar o tubo (null = pode guardar). */
export function bloqueioDoTubo(t: TuboDoPedido): string | null {
  if (t.soApoio) return 'Tubo só com exames de apoio: não fica na soroteca desta unidade'
  if (!t.coletado) return 'Tubo ainda não coletado'
  if (t.guardado?.status === 'descartada') return 'Amostra já descartada'
  return null
}

// ----------------------------- Linha do tempo -----------------------------

export interface RastreioSoroteca {
  amostra: AmostraSoroteca & { patient_birth: string | null }
  coleta: { quando: string | null; responsavel: string | null } | null
  exames: { exam_id: string; nome: string; status: string; liberado_em: string | null; liberado_por: string | null }[]
  movimentos: {
    tipo: 'entrada' | 'movimentacao' | 'retirada' | 'descarte'; quando: string; equipamento_nome: string | null; linha: number | null; coluna: number | null
    de_equipamento_nome: string | null; de_linha: number | null; de_coluna: number | null; motivo: string | null; observacao: string | null
    status_resultado: StatusResultado | null; responsavel_nome: string | null; usuario_nome: string | null
  }[]
  laboratorio: { nome: string | null; responsavel: string | null; registro: string | null; logo: string | null } | null
}

export type TipoEvento = 'coleta' | 'entrada' | 'movimentacao' | 'retirada' | 'consulta' | 'descarte' | 'liberacao'

export interface EventoLinhaDoTempo {
  tipo: TipoEvento
  quando: string
  titulo: string
  linhas: string[]
}

const pos = (eq: string | null, l: number | null, c: number | null) => (eq && l && c ? `${eq} — ${rotuloPosicao(l, c)}` : eq || '')

/** Junta coleta, movimentações e liberações em ordem de data (status progressivo a cada liberação). */
export function linhaDoTempo(r: RastreioSoroteca): EventoLinhaDoTempo[] {
  const ev: EventoLinhaDoTempo[] = []
  if (r.coleta?.quando) {
    ev.push({ tipo: 'coleta', quando: r.coleta.quando, titulo: 'Coleta realizada', linhas: r.coleta.responsavel ? [`Responsável: ${r.coleta.responsavel}`] : [] })
  }
  for (const m of r.movimentos || []) {
    const quem = m.usuario_nome ? [`Responsável: ${m.usuario_nome}`] : []
    if (m.tipo === 'entrada') {
      ev.push({ tipo: 'entrada', quando: m.quando, titulo: `Armazenada em ${pos(m.equipamento_nome, m.linha, m.coluna)}`,
        linhas: [...quem, ...(m.status_resultado ? [`Status na entrada: ${STATUS_LABEL[m.status_resultado]}`] : [])] })
    } else if (m.tipo === 'movimentacao') {
      ev.push({ tipo: 'movimentacao', quando: m.quando, titulo: `Movida para ${pos(m.equipamento_nome, m.linha, m.coluna)}`,
        linhas: [...quem, ...(m.de_equipamento_nome ? [`Antes: ${pos(m.de_equipamento_nome, m.de_linha, m.de_coluna)}`] : [])] })
    } else if (m.tipo === 'retirada') {
      const consulta = m.motivo === 'Consulta externa'
      ev.push({ tipo: consulta ? 'consulta' : 'retirada', quando: m.quando,
        titulo: consulta ? 'Consultada (retirada da soroteca)' : `Retirada de ${pos(m.de_equipamento_nome, m.de_linha, m.de_coluna)}`,
        linhas: [...quem, ...(m.motivo ? [`Motivo: ${m.motivo}`] : []), ...(m.observacao ? [`Observação: ${m.observacao}`] : [])] })
    } else if (m.tipo === 'descarte') {
      ev.push({ tipo: 'descarte', quando: m.quando, titulo: 'Descartada',
        linhas: [`Responsável: ${m.responsavel_nome || m.usuario_nome || '—'}`, ...(m.motivo ? [`Motivo: ${m.motivo}`] : []),
          ...(m.observacao ? [`Observação: ${m.observacao}`] : []),
          ...(m.usuario_nome && m.responsavel_nome && m.usuario_nome !== m.responsavel_nome ? [`Registrado por: ${m.usuario_nome}`] : [])] })
    }
  }
  const validos = (r.exames || []).filter(e => e.status !== 'cancelled')
  const total = validos.length
  const liberacoes = validos.filter(e => e.status === 'released' && e.liberado_em)
  const porMomento = new Map<string, typeof liberacoes>()
  for (const e of liberacoes) {
    const k = String(e.liberado_em).slice(0, 16)
    porMomento.set(k, [...(porMomento.get(k) || []), e])
  }
  let acumulado = 0
  for (const grupo of [...porMomento.values()].sort((a, b) => String(a[0].liberado_em).localeCompare(String(b[0].liberado_em)))) {
    acumulado += grupo.length
    const st = statusResultado(total, acumulado)
    ev.push({ tipo: 'liberacao', quando: String(grupo[0].liberado_em), titulo: `Resultado liberado (${grupo.map(e => e.nome).join(' + ')})`,
      linhas: [st === 'liberado' ? 'Status: Liberado (todos os exames)' : `Status: Parcial (${acumulado} de ${total} ${total === 1 ? 'exame liberado' : 'exames liberados'})`,
        ...(grupo[0].liberado_por ? [`Liberado por: ${grupo[0].liberado_por}`] : [])] })
  }
  return ev.sort((a, b) => new Date(a.quando).getTime() - new Date(b.quando).getTime())
}
