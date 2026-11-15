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

/** Prateleira de um equipamento: grade própria (linha = letra, coluna = número). */
export interface PrateleiraSoroteca {
  id: string
  nome: string
  linhas: number
  colunas: number
  ordem: number
  ocupadas: number
}

export interface EquipamentoSoroteca {
  id: string
  nome: string
  tipo: 'geladeira' | 'freezer' | 'estante' | 'outro'
  temperatura: string | null
  workbench_id: string | null
  bancada_nome: string | null
  ativo: boolean
  ocupadas: number
  /** Soma das posições de todas as prateleiras. */
  capacidade: number
  prateleiras: PrateleiraSoroteca[]
  /** Etiqueta da estante (ex.: E79002); geladeira/freezer não têm. */
  codigo?: string | null
  /** Só estantes: em preenchimento (fora da geladeira) ou armazenada. */
  situacao?: SituacaoEstante | null
  local_equipamento_id?: string | null
  local_equipamento_nome?: string | null
  local_prateleira_id?: string | null
  local_prateleira_nome?: string | null
  local_em?: string | null
}

export type SituacaoEstante = 'em_preenchimento' | 'armazenada'

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
  prateleira_id: string | null
  prateleira_nome: string | null
  /** Estante onde o tubo está e onde a estante está guardada (geladeira > prateleira). */
  equipamento_tipo?: EquipamentoSoroteca['tipo'] | null
  estante_codigo?: string | null
  local_equipamento_id?: string | null
  local_nome?: string | null
  local_prateleira_nome?: string | null
  linha: number | null
  coluna: number | null
  armazenada_em: string | null
  descartada_em: string | null
  total: number
  liberados: number
  status_resultado: StatusResultado
  /** Retirada/descartada: último endereço completo que o tubo teve (Geladeira > Prateleira > Estante > posição). */
  ultimo_endereco?: string | null
  /** Já passou por um "Finalizar": só sai pela Consulta (Retirar tubo, com justificativa). */
  finalizada?: boolean
}

export const TIPOS_EQUIPAMENTO: { value: EquipamentoSoroteca['tipo']; label: string }[] = [
  { value: 'geladeira', label: 'Geladeira' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'estante', label: 'Estante' },
  { value: 'outro', label: 'Outro' },
]

export const MOTIVOS_RETIRADA = ['Repetição de exame', 'Envio ao laboratório de apoio', 'Solicitação médica', 'Guardado por engano', 'Outro'] as const
/** Retirada de tubo finalizado: justificativa obrigatória com este mínimo de caracteres (o banco confere o mesmo). */
export const JUSTIFICATIVA_RETIRADA_MIN = 10

/** Motivo para não deixar confirmar a retirada (null = pode). */
export function erroRetirada(motivo: string, justificativa: string): string | null {
  if (!(MOTIVOS_RETIRADA as readonly string[]).includes(motivo)) return 'Escolha o motivo'
  const n = justificativa.trim().length
  if (n < JUSTIFICATIVA_RETIRADA_MIN) return `Justificativa com pelo menos ${JUSTIFICATIVA_RETIRADA_MIN} caracteres (faltam ${JUSTIFICATIVA_RETIRADA_MIN - n})`
  return null
}

/** Na Entrada só sai (sem justificativa) o tubo guardado que ainda não passou por um Finalizar. */
export const podeRemoverNaEntrada = (a: Pick<AmostraSoroteca, 'status' | 'finalizada'> | null | undefined) =>
  !!a && a.status === 'armazenada' && !a.finalizada

/** Porcentagem real de posições preenchidas (0–100), para a barra de progresso. */
export function percentualOcupacao(preenchidas: number, total: number): number {
  if (!total || total <= 0 || !preenchidas || preenchidas <= 0) return 0
  return Math.min(100, Math.round((preenchidas / total) * 100))
}
export const MOTIVOS_DESCARTE = ['Prazo de retenção vencido', 'Descarte de rotina', 'Amostra danificada', 'Outro'] as const

/** Único motivo de descarte em que a justificativa é opcional (estante, lote e manual; o banco confere o mesmo em soroteca__justificativa_ok). */
export const MOTIVO_DESCARTE_SEM_JUSTIFICATIVA = 'Prazo de retenção vencido'
export const JUSTIFICATIVA_DESCARTE_MIN = 10
export const justificativaDescarteObrigatoria = (motivo: string) => motivo.trim() !== MOTIVO_DESCARTE_SEM_JUSTIFICATIVA
/** Motivo para não deixar confirmar o descarte pela justificativa (null = pode). */
export function erroJustificativaDescarte(motivo: string, justificativa: string): string | null {
  if (!justificativaDescarteObrigatoria(motivo)) return null
  const n = justificativa.trim().length
  return n >= JUSTIFICATIVA_DESCARTE_MIN ? null : `Explique o motivo com pelo menos ${JUSTIFICATIVA_DESCARTE_MIN} caracteres (faltam ${JUSTIFICATIVA_DESCARTE_MIN - n})`
}

/** Bipe de confirmação na janela "Descartar estante": vazio, confere com o código da estante ou é de outra estante. */
export type ConfereEtiqueta = 'vazio' | 'ok' | 'errado'
export function conferirEtiquetaEstante(bipado: string, codigo: string | null | undefined): ConfereEtiqueta {
  const b = bipado.trim().toUpperCase()
  if (!b) return 'vazio'
  return codigo && b === codigo.trim().toUpperCase() ? 'ok' : 'errado'
}

/** Lista do descarte em lote: tubo "Retirada" (em reprocessamento) não entra. */
export const entraNoDescarteEmLote = (a: Pick<AmostraSoroteca, 'status'>) => a.status === 'armazenada'

/** Linha 1 = A … 26 = Z, 27 = AA … 52 = AZ. */
export function letraLinha(n: number): string {
  if (n < 1) return '?'
  return n <= 26 ? String.fromCharCode(64 + n) : `A${String.fromCharCode(64 + n - 26)}`
}

/** "A05" */
export const rotuloPosicao = (linha: number, coluna: number) => `${letraLinha(linha)}${String(coluna).padStart(2, '0')}`
export const chavePosicao = (linha: number, coluna: number) => `${linha}:${coluna}`

/** Endereço completo: "Geladeira 01 > Prateleira 2 > B05" (partes ausentes são omitidas). */
export function enderecoPosicao(equipamento: string | null | undefined, prateleira: string | null | undefined, linha?: number | null, coluna?: number | null): string {
  return [equipamento, prateleira, linha && coluna ? rotuloPosicao(linha, coluna) : null].filter(Boolean).join(' > ')
}

type ComLocal = Pick<AmostraSoroteca, 'status' | 'equipamento_nome' | 'prateleira_nome' | 'linha' | 'coluna'> &
  Partial<Pick<AmostraSoroteca, 'local_nome' | 'local_prateleira_nome'>>

/**
 * Endereço atual de uma amostra guardada (null se retirada/descartada):
 * "Geladeira 01 > Prateleira 2 > Estante E79002 > B05", ou "Estante E79002 > B05" enquanto a estante está fora da geladeira.
 */
export const enderecoAmostra = (a: ComLocal) =>
  a.status === 'armazenada' && a.linha && a.coluna
    ? [a.local_nome, a.local_prateleira_nome, enderecoPosicao(a.equipamento_nome, a.prateleira_nome, a.linha, a.coluna)].filter(Boolean).join(' > ')
    : null

/** Texto de localização para listas: endereço atual, ou onde estava (retirada/descartada). */
export function localizacaoTexto(a: ComLocal & Pick<AmostraSoroteca, 'ultimo_endereco'>): string {
  const atual = enderecoAmostra(a)
  if (atual) return atual
  const rotulo = a.status === 'retirada' ? 'Retirada' : a.status === 'descartada' ? 'Descartada' : '—'
  return a.ultimo_endereco && rotulo !== '—' ? `${rotulo} · estava em ${a.ultimo_endereco}` : rotulo
}

// ----------------------------- Estantes -----------------------------

export const ehEstante = (e: Pick<EquipamentoSoroteca, 'tipo'> | null | undefined) => e?.tipo === 'estante'
/** Geladeira, freezer ou outro: guarda estantes nas prateleiras. */
export const ehArmario = (e: Pick<EquipamentoSoroteca, 'tipo'> | null | undefined) => !!e && e.tipo !== 'estante'

/** Opções do modal "Nova estante" (entrada rápida). */
export const LINHAS_ESTANTE = [2, 4, 6, 8] as const
export const COLUNAS_ESTANTE = [8, 10, 12, 16, 20] as const

/** Mesmas regras do banco (soroteca_estante_gravar). */
export function erroCodigoEstante(codigo: string): string | null {
  const c = codigo.trim().toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9-]{1,29}$/.test(c)) return 'Código da estante: de 2 a 30 letras, números ou hífen'
  if (/^[A-Z][A-Z0-9]{7}[0-9]$/.test(c)) return 'Esse código se parece com a etiqueta de um tubo; escolha outro'
  return null
}

/** Próximo código livre no padrão E00001 (E + 5 dígitos), depois do maior já usado. */
export function sugerirCodigoEstante(equipamentos: Pick<EquipamentoSoroteca, 'codigo'>[]): string {
  let max = 0
  for (const e of equipamentos) {
    const m = /^E(\d+)$/.exec(String(e.codigo || '').toUpperCase())
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `E${String(max + 1).padStart(5, '0')}`
}

/** Estante com essa etiqueta (bipe), sem diferenciar maiúsculas. */
export const estanteDoCodigo = (equipamentos: EquipamentoSoroteca[], codigo: string) => {
  const c = codigo.trim().toUpperCase()
  return c ? equipamentos.find(e => ehEstante(e) && String(e.codigo || '').toUpperCase() === c) ?? null : null
}

/** Grade única da estante. */
export const gradeDaEstante = (e: Pick<EquipamentoSoroteca, 'prateleiras'> | null | undefined) => prateleirasDe(e)[0] ?? null

/** Onde a estante está guardada ("Geladeira 01 > Prateleira 2") ou null se está em preenchimento. */
export const localDaEstante = (e: Pick<EquipamentoSoroteca, 'situacao' | 'local_equipamento_nome' | 'local_prateleira_nome'>) =>
  e.situacao === 'armazenada' ? [e.local_equipamento_nome, e.local_prateleira_nome].filter(Boolean).join(' > ') || null : null

/** Próxima posição livre da estante (A01 → A02 → … → D16), somando posições já usadas nesta sessão. */
export function proximaPosicaoEstante(
  estante: Pick<EquipamentoSoroteca, 'prateleiras'>,
  amostras: AmostraSoroteca[],
  extra: { linha: number; coluna: number }[] = [],
): { prateleira_id: string; linha: number; coluna: number } | null {
  const g = gradeDaEstante(estante)
  if (!g) return null
  const ocup = ocupadasDo(g.id, amostras, extra.map(p => ({ prateleira_id: g.id, ...p })))
  const p = primeiraLivre(g.linhas, g.colunas, ocup)
  return p ? { prateleira_id: g.id, ...p } : null
}

/** Estantes guardadas numa prateleira de geladeira/freezer. */
export const estantesNaPrateleira = (equipamentos: EquipamentoSoroteca[], prateleiraId: string) =>
  equipamentos.filter(e => ehEstante(e) && e.situacao === 'armazenada' && e.local_prateleira_id === prateleiraId)
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)))

/** Prateleira no desenho do equipamento: vagas de cima para baixo, livres e se está cheia. */
export interface PrateleiraDesenho {
  id: string
  nome: string
  /** 1 = prateleira de cima. */
  numero: number
  capacidade: number
  estantes: EquipamentoSoroteca[]
  /** Uma entrada por vaga (estante guardada ou null = livre); nunca menos que as estantes guardadas. */
  vagas: (EquipamentoSoroteca | null)[]
  livres: number
  cheia: boolean
}

/**
 * Desenho de uma geladeira/freezer como foi cadastrada: prateleiras na ordem (de cima para baixo) e
 * uma vaga por estante que cabe. `ignorarEstanteId` não conta a própria estante (Finalizar).
 */
export function desenhoDoArmario(
  armario: Pick<EquipamentoSoroteca, 'prateleiras'> | null | undefined,
  equipamentos: EquipamentoSoroteca[],
  ignorarEstanteId?: string | null,
): PrateleiraDesenho[] {
  return prateleirasDe(armario).map((p, i) => {
    const capacidade = p.linhas * p.colunas
    const estantes = estantesNaPrateleira(equipamentos, p.id).filter(e => e.id !== ignorarEstanteId)
    const livres = Math.max(0, capacidade - estantes.length)
    const vagas: (EquipamentoSoroteca | null)[] = [...estantes, ...Array.from({ length: livres }, () => null)]
    return { id: p.id, nome: p.nome, numero: i + 1, capacidade, estantes, vagas, livres, cheia: livres <= 0 }
  })
}

/** Endereço de um tubo já guardado (resultado do bipe), com a geladeira da estante. */
export function enderecoGuardado(
  g: Pick<PedidoLocalizado['guardados'][number], 'equipamento_id' | 'equipamento_nome' | 'prateleira_nome' | 'linha' | 'coluna'>,
  equipamentos: EquipamentoSoroteca[],
): string {
  const e = equipamentos.find(x => x.id === g.equipamento_id)
  return [e ? localDaEstante(e) : null, enderecoPosicao(g.equipamento_nome, g.prateleira_nome, g.linha, g.coluna)].filter(Boolean).join(' > ')
}

/** Prateleiras na ordem cadastrada. */
export const prateleirasDe = (e: Pick<EquipamentoSoroteca, 'prateleiras'> | null | undefined) =>
  [...(e?.prateleiras ?? [])].sort((a, b) => a.ordem - b.ordem)

export const capacidadePrateleiras = (ps: { linhas: number; colunas: number }[]) => ps.reduce((t, p) => t + p.linhas * p.colunas, 0)

export interface PrateleiraForm { id?: string | null; nome: string; linhas: number; colunas: number }

/** Mesmas regras do banco (soroteca_equipamento_gravar): ao menos 1, até 30, nomes únicos, 1–52 linhas, 1–99 colunas. */
export function erroPrateleiras(ps: PrateleiraForm[]): string | null {
  if (!ps.length) return 'Cadastre pelo menos uma prateleira'
  if (ps.length > 30) return 'No máximo 30 prateleiras por equipamento'
  const nomes = new Set<string>()
  for (const p of ps) {
    const nome = p.nome.trim()
    if (!nome) return 'Informe o nome de cada prateleira'
    if (!Number.isInteger(p.linhas) || p.linhas < 1 || p.linhas > 52) return `Linhas da prateleira ${nome} devem ficar entre 1 e 52`
    if (!Number.isInteger(p.colunas) || p.colunas < 1 || p.colunas > 99) return `Colunas da prateleira ${nome} devem ficar entre 1 e 99`
    const k = nome.toLowerCase()
    if (nomes.has(k)) return 'Há duas prateleiras com o mesmo nome'
    nomes.add(k)
  }
  return null
}

/** Mesma regra do banco (soroteca__status). */
export function statusResultado(total: number, liberados: number): StatusResultado {
  if (total > 0 && liberados >= total) return 'liberado'
  if (liberados > 0) return 'parcial'
  return 'em_analise'
}

export const STATUS_LABEL: Record<StatusResultado, string> = { liberado: 'Liberado', parcial: 'Parcial', em_analise: 'Em análise' }

/** Tubo da estante que impede o Finalizar (mesma regra de soroteca_estante_guardar): qualquer status que não seja Liberado. */
export interface TuboBloqueiaFinalizar { id: string; codigo: string; status: string }
export function tubosQueBloqueiamFinalizar(prateleiraId: string | null | undefined, amostras: AmostraSoroteca[]): TuboBloqueiaFinalizar[] {
  if (!prateleiraId) return []
  return amostras
    .filter(a => a.status === 'armazenada' && a.prateleira_id === prateleiraId && a.status_resultado !== 'liberado')
    .sort((x, y) => (x.linha ?? 0) - (y.linha ?? 0) || (x.coluna ?? 0) - (y.coluna ?? 0))
    .map(a => ({ id: a.id, codigo: a.codigo_amostra, status: !a.total ? 'Sem resultado' : STATUS_LABEL[a.status_resultado] ?? 'Em análise' }))
}

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

export interface PosicaoSoroteca { equipamento_id: string; prateleira_id: string; linha: number; coluna: number }

/** Ocupadas de uma prateleira (opcionalmente somando posições já reservadas no lote). */
export function ocupadasDo(prateleiraId: string, amostras: AmostraSoroteca[], reservas: Pick<PosicaoSoroteca, 'prateleira_id' | 'linha' | 'coluna'>[] = []) {
  const s = new Set<string>()
  for (const a of amostras) if (a.status === 'armazenada' && a.prateleira_id === prateleiraId && a.linha && a.coluna) s.add(chavePosicao(a.linha, a.coluna))
  for (const r of reservas) if (r.prateleira_id === prateleiraId) s.add(chavePosicao(r.linha, r.coluna))
  return s
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
  guardados: {
    id: string; tubo_indice: number; codigo_amostra: string; status: Situacao; equipamento_id: string | null; equipamento_nome: string | null
    prateleira_id: string | null; prateleira_nome: string | null; linha: number | null; coluna: number | null
  }[]
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
  /** Exames internos do tubo, com liberado/pendente (apoio e cancelados ficam de fora). */
  exames: { id: string; nome: string; liberado: boolean }[]
  /** Bancadas dos exames internos, sem repetir. */
  bancadas: string[]
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
    const exames: TuboDoPedido['exames'] = []
    for (const e of internos) {
      const st = p.resultados?.[idDoExame(e)]
      if (st === 'cancelled') continue
      total++
      if (st === 'released') liberados++
      exames.push({ id: idDoExame(e), nome: String(e.name || e.examName || ''), liberado: st === 'released' })
    }
    const bancadas = [...new Set(internos.map(e => String(e.bancadaNome || '').trim()).filter(Boolean))]
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
      exames,
      bancadas,
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
    tipo: 'entrada' | 'movimentacao' | 'retirada' | 'descarte' | 'remocao'; quando: string; equipamento_nome: string | null; prateleira_nome?: string | null
    linha: number | null; coluna: number | null
    de_equipamento_nome: string | null; de_prateleira_nome?: string | null; de_linha: number | null; de_coluna: number | null; motivo: string | null; observacao: string | null
    status_resultado: StatusResultado | null; responsavel_nome: string | null; usuario_nome: string | null
  }[]
  /** Estante guardada na geladeira / aberta para preencher enquanto o tubo estava nela. */
  estante_movimentos?: { tipo: 'guardada' | 'aberta'; quando: string; estante_nome: string | null; equipamento_nome: string | null; prateleira_nome: string | null; usuario_nome: string | null }[]
  laboratorio: { nome: string | null; responsavel: string | null; registro: string | null; logo: string | null } | null
}

export type TipoEvento = 'coleta' | 'entrada' | 'movimentacao' | 'retirada' | 'consulta' | 'descarte' | 'liberacao' | 'estante'

export interface EventoLinhaDoTempo {
  tipo: TipoEvento
  quando: string
  titulo: string
  linhas: string[]
}


/** Junta coleta, movimentações e liberações em ordem de data (status progressivo a cada liberação). */
export function linhaDoTempo(r: RastreioSoroteca): EventoLinhaDoTempo[] {
  const ev: EventoLinhaDoTempo[] = []
  if (r.coleta?.quando) {
    ev.push({ tipo: 'coleta', quando: r.coleta.quando, titulo: 'Coleta realizada', linhas: r.coleta.responsavel ? [`Responsável: ${r.coleta.responsavel}`] : [] })
  }
  let anterior: string | null = null
  for (const m of r.movimentos || []) {
    const quem = m.usuario_nome ? [`Responsável: ${m.usuario_nome}`] : []
    const devolvida = m.tipo === 'entrada' && (anterior === 'retirada' || anterior === 'remocao')
    anterior = m.tipo
    if (m.tipo === 'entrada') {
      ev.push({ tipo: 'entrada', quando: m.quando, titulo: `${devolvida ? 'Devolvida e armazenada' : 'Armazenada'} em ${enderecoPosicao(m.equipamento_nome, m.prateleira_nome, m.linha, m.coluna)}`,
        linhas: [...quem, ...(m.status_resultado ? [`Status na entrada: ${STATUS_LABEL[m.status_resultado]}`] : [])] })
    } else if (m.tipo === 'movimentacao') {
      ev.push({ tipo: 'movimentacao', quando: m.quando, titulo: `Movida para ${enderecoPosicao(m.equipamento_nome, m.prateleira_nome, m.linha, m.coluna)}`,
        linhas: [...quem, ...(m.de_equipamento_nome ? [`Antes: ${enderecoPosicao(m.de_equipamento_nome, m.de_prateleira_nome, m.de_linha, m.de_coluna)}`] : [])] })
    } else if (m.tipo === 'retirada') {
      const consulta = m.motivo === 'Consulta externa'
      ev.push({ tipo: consulta ? 'consulta' : 'retirada', quando: m.quando,
        titulo: consulta ? 'Consultada (retirada da soroteca)' : `Retirada de ${enderecoPosicao(m.de_equipamento_nome, m.de_prateleira_nome, m.de_linha, m.de_coluna)}`,
        linhas: [...quem, ...(m.motivo ? [`Motivo: ${m.motivo}`] : []), ...(m.observacao ? [`Justificativa: ${m.observacao}`] : [])] })
    } else if (m.tipo === 'remocao') {
      ev.push({ tipo: 'retirada', quando: m.quando, titulo: `Removida de ${enderecoPosicao(m.de_equipamento_nome, m.de_prateleira_nome, m.de_linha, m.de_coluna)} antes de finalizar`,
        linhas: quem })
    } else if (m.tipo === 'descarte') {
      ev.push({ tipo: 'descarte', quando: m.quando, titulo: 'Descartada',
        linhas: [`Responsável: ${m.responsavel_nome || m.usuario_nome || '—'}`, ...(m.motivo ? [`Motivo: ${m.motivo}`] : []),
          ...(m.observacao ? [`Observação: ${m.observacao}`] : []),
          ...(m.usuario_nome && m.responsavel_nome && m.usuario_nome !== m.responsavel_nome ? [`Registrado por: ${m.usuario_nome}`] : [])] })
    }
  }
  for (const m of r.estante_movimentos || []) {
    const onde = [m.equipamento_nome, m.prateleira_nome].filter(Boolean).join(' > ')
    ev.push({ tipo: 'estante', quando: m.quando,
      titulo: m.tipo === 'guardada' ? `${m.estante_nome || 'Estante'} finalizada: guardada em ${onde}` : `${m.estante_nome || 'Estante'} reaberta: saiu de ${onde} para preenchimento`,
      linhas: m.usuario_nome ? [`Responsável: ${m.usuario_nome}`] : [] })
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

const fmt = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...opts }).format(d)
}
/** Data no horário de Brasília (dd/mm/aaaa). */
export const dataBR = (iso: string | null | undefined) => fmt(iso, { day: '2-digit', month: '2-digit', year: 'numeric' })
/** Data e hora no horário de Brasília (dd/mm/aaaa hh:mm). */
export const dataHoraBR = (iso: string | null | undefined) =>
  fmt(iso, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')

// ----------------------------- Descarte de estante -----------------------------

export const MOTIVOS_DESCARTE_ESTANTE = ['Prazo de retenção vencido', 'Estante danificada', 'Outro'] as const
export type DestinoEstante = 'reaproveitar' | 'inativar'

/** Estante ativa na aba "Por estante" (contagens calculadas no banco). */
export interface EstanteDescarte {
  id: string
  codigo: string
  nome: string
  situacao: SituacaoEstante
  local_equipamento_nome: string | null
  local_prateleira_nome: string | null
  tubos: number
  mais_antigo: string | null
  vencidos: number
  vencendo: number
  pendentes: number
}

/** Tubo da estante conferido antes do descarte. */
export interface TuboConferido {
  id: string
  codigo_amostra: string
  patient_name: string | null
  linha: number
  coluna: number
  validade: string | null
  coletada_em: string | null
  armazenada_em: string | null
  /** Nomes dos exames internos ainda não liberados. */
  pendentes: string[]
}

export interface EstanteConferida {
  id: string; codigo: string; nome: string; ativo: boolean; situacao: SituacaoEstante
  local_equipamento_nome: string | null; local_prateleira_nome: string | null
  tubos: TuboConferido[]
}

export type SituacaoDescarte = 'vencida' | 'vencendo' | 'no_prazo' | 'vazia'

/** Vencida: todos os tubos passaram do prazo; vencendo: algum já venceu ou vence dentro do aviso; senão no prazo. */
export function situacaoDescarteEstante(e: Pick<EstanteDescarte, 'tubos' | 'vencidos' | 'vencendo'>): SituacaoDescarte {
  if (!e.tubos) return 'vazia'
  if (e.vencidos >= e.tubos) return 'vencida'
  if (e.vencidos + e.vencendo > 0) return 'vencendo'
  return 'no_prazo'
}

/**
 * Por que o tubo pede "Descartar mesmo assim" (lista vazia = pode descartar direto).
 * Mesma regra do banco (soroteca_estante_descartar): exame pendente, sem prazo ou ainda dentro do prazo.
 */
export function riscoDescarteTubo(t: Pick<TuboConferido, 'validade' | 'pendentes'>, agora: number = Date.now()): string[] {
  const r: string[] = []
  if (t.pendentes.length) r.push(`exame pendente: ${t.pendentes.join(', ')}`)
  const v = t.validade ? new Date(t.validade).getTime() : NaN
  if (Number.isNaN(v)) r.push('sem prazo de retenção')
  else if (v >= agora) r.push(`dentro do prazo (até ${dataBR(t.validade)})`)
  return r
}

/** Onde a estante está ("Geladeira 01 > Prateleira 2") ou "fora da geladeira". */
export const ondeEstaEstante = (e: Pick<EstanteDescarte, 'situacao' | 'local_equipamento_nome' | 'local_prateleira_nome'>) =>
  localDaEstante(e) ?? 'Fora da geladeira (em preenchimento)'

// ----------------------------- Folha de descarte -----------------------------

export type TipoDescarte = 'estante' | 'lote' | 'manual'
export const TIPO_DESCARTE_LABEL: Record<TipoDescarte, string> = { estante: 'Por estante', lote: 'Em lote', manual: 'Manual' }

/** Linha da folha: retrato do tubo no momento do descarte. */
export interface ItemFolhaDescarte {
  ordem: number
  posicao: string | null
  endereco: string | null
  codigo_amostra: string
  patient_name: string | null
  bancada_nome: string | null
  coletada_em: string | null
  validade: string | null
  pendente: boolean
  no_prazo: boolean
}

export interface FolhaDescarte {
  id: string
  tipo: TipoDescarte
  estante_codigo: string | null
  estante_origem: string | null
  motivo: string
  observacao: string | null
  responsavel_nome: string
  usuario_nome: string | null
  tubos: number
  created_at: string
  itens: ItemFolhaDescarte[]
}

/** Marca da linha: tubo descartado com exame pendente e/ou ainda dentro do prazo ('' = normal). */
export function marcaItemFolha(i: Pick<ItemFolhaDescarte, 'pendente' | 'no_prazo'>): string {
  return [i.pendente ? 'Exame pendente' : null, i.no_prazo ? 'No prazo' : null].filter(Boolean).join(' · ')
}

/** Posição exibida: na folha por estante basta "B05"; nos outros tipos, o endereço completo (ou "Retirada"). */
export const posicaoItemFolha = (tipo: TipoDescarte, i: Pick<ItemFolhaDescarte, 'posicao' | 'endereco'>) =>
  (tipo === 'estante' ? i.posicao : i.endereco) || i.posicao || 'Retirada'

/** Totais do rodapé. */
export const totaisFolha = (f: Pick<FolhaDescarte, 'itens'>) => ({
  total: f.itens.length,
  marcados: f.itens.filter(i => i.pendente || i.no_prazo).length,
})

/** Evento do histórico da estante. */
export interface MovimentoEstante {
  id: string
  tipo: 'criada' | 'guardada' | 'aberta' | 'descartada' | 'inativada' | 'reativada'
  quando: string
  equipamento_nome: string | null
  prateleira_nome: string | null
  tubos: number
  motivo: string | null
  observacao: string | null
  responsavel_nome: string | null
  destino: DestinoEstante | null
  descarte_id: string | null
  usuario_nome: string | null
}

export const TIPO_MOVIMENTO_ESTANTE: Record<MovimentoEstante['tipo'], string> = {
  criada: 'Criada', guardada: 'Guardada na geladeira', aberta: 'Retirada para preenchimento',
  descartada: 'Tubos descartados', inativada: 'Inativada', reativada: 'Reativada',
}

// ----------------------------- Rastreabilidade da estante -----------------------------

export type TipoEventoEstante =
  | 'criada' | 'etiqueta' | 'folha'
  | 'tubo_colocado' | 'tubo_devolvido' | 'tubo_removido' | 'tubo_retirado' | 'tubo_descartado' | 'tubo_movido'
  | 'finalizada' | 'reaberta' | 'descartada' | 'inativada' | 'reativada'

/** Evento da linha do tempo da estante (montado no banco por soroteca_estante_rastreio). */
export interface EventoEstante {
  id: string
  tipo: TipoEventoEstante
  quando: string
  usuario_nome: string | null
  amostra_id: string | null
  codigo_amostra: string | null
  patient_name: string | null
  /** Posição onde o tubo ficou. */
  posicao: string | null
  /** Posição de onde o tubo saiu. */
  de_posicao: string | null
  /** Outra estante envolvida (de onde veio / para onde foi). */
  outra_estante: string | null
  equipamento_nome: string | null
  prateleira_nome: string | null
  motivo: string | null
  observacao: string | null
  tubos: number | null
  destino: DestinoEstante | null
  descarte_id: string | null
  reimpressao: boolean | null
  /** Montado a partir de registros antigos (antes do histórico por estante). */
  recuperado: boolean
}

export interface CabecalhoEstante {
  id: string; codigo: string | null; nome: string; linhas: number; colunas: number; bancada_nome: string | null
  ativo: boolean; situacao: SituacaoEstante | null; local_equipamento_nome: string | null; local_prateleira_nome: string | null
  tubos: number; criada_em: string | null; criada_por: string | null
}

export interface RastreioEstante {
  estante: CabecalhoEstante
  total: number
  usuarios: string[]
  eventos: EventoEstante[]
}

export interface FiltrosRastreioEstante { tipos?: TipoEventoEstante[]; usuario?: string; de?: string; ate?: string }

/** Eventos por página na linha do tempo da estante. */
export const EVENTOS_POR_PAGINA = 50

export const TIPO_EVENTO_ESTANTE: Record<TipoEventoEstante, string> = {
  criada: 'Estante criada', etiqueta: 'Etiqueta impressa', folha: 'Folha de descarte impressa',
  tubo_colocado: 'Tubo colocado', tubo_devolvido: 'Tubo devolvido', tubo_removido: 'Tubo removido antes de finalizar',
  tubo_retirado: 'Tubo retirado', tubo_descartado: 'Tubo descartado', tubo_movido: 'Tubo trocado de lugar',
  finalizada: 'Estante finalizada', reaberta: 'Estante reaberta', descartada: 'Estante descartada',
  inativada: 'Estante inativada', reativada: 'Estante reativada',
}

/** Situação atual no cabeçalho: Inativa / Guardada em … / Vazia / Em preenchimento. */
export function situacaoEstanteTexto(e: Pick<CabecalhoEstante, 'ativo' | 'situacao' | 'local_equipamento_nome' | 'local_prateleira_nome' | 'tubos'>): string {
  if (!e.ativo) return 'Inativa'
  const local = localDaEstante(e)
  if (local) return `Guardada em ${local}`
  return e.tubos > 0 ? 'Em preenchimento' : 'Vazia'
}

const tubosTxt = (n: number | null | undefined) => `${n ?? 0} ${(n ?? 0) === 1 ? 'tubo' : 'tubos'}`

/** Título e detalhes de um evento da estante, como aparecem na tela e no PDF. */
export function descreverEventoEstante(e: EventoEstante): { titulo: string; linhas: string[] } {
  const tubo = `Tubo ${e.codigo_amostra || '—'}`
  const onde = [e.equipamento_nome, e.prateleira_nome].filter(Boolean).join(' > ')
  const linhas: string[] = []
  if (e.codigo_amostra && e.patient_name) linhas.push(`Paciente: ${e.patient_name}`)
  let titulo: string
  switch (e.tipo) {
    case 'criada': titulo = 'Estante criada'; break
    case 'etiqueta': titulo = e.reimpressao ? 'Etiqueta reimpressa' : 'Etiqueta impressa'; break
    case 'folha': titulo = e.reimpressao ? 'Folha de descarte reimpressa' : 'Folha de descarte impressa'; break
    case 'tubo_colocado':
      titulo = `${tubo} colocado em ${e.posicao || '—'}`
      if (e.outra_estante) linhas.push(`Veio de ${e.outra_estante}${e.de_posicao ? ` > ${e.de_posicao}` : ''}`)
      break
    case 'tubo_devolvido': titulo = `${tubo} devolvido em ${e.posicao || '—'}`; break
    case 'tubo_removido': titulo = `${tubo} removido de ${e.de_posicao || '—'} antes de finalizar`; break
    case 'tubo_retirado': titulo = `${tubo} retirado de ${e.de_posicao || '—'}`; break
    case 'tubo_descartado': titulo = `${tubo} descartado de ${e.de_posicao || '—'}`; break
    case 'tubo_movido':
      titulo = e.outra_estante
        ? `${tubo} movido de ${e.de_posicao || '—'} para ${e.outra_estante} > ${e.posicao || '—'}`
        : `${tubo} trocado de ${e.de_posicao || '—'} para ${e.posicao || '—'}`
      break
    case 'finalizada':
      titulo = onde ? `Estante finalizada: guardada em ${onde}` : 'Estante finalizada'
      if (e.tubos != null) linhas.push(tubosTxt(e.tubos))
      break
    case 'reaberta': titulo = onde ? `Estante reaberta: saiu de ${onde}` : 'Estante reaberta'; break
    case 'descartada':
      titulo = `Estante descartada: ${tubosTxt(e.tubos)}`
      if (onde) linhas.push(`Estava em ${onde}`)
      if (e.destino) linhas.push(e.destino === 'reaproveitar' ? 'Estante reaproveitada (vazia, mesmo código)' : 'Estante inativada')
      break
    case 'inativada': titulo = 'Estante inativada'; break
    case 'reativada': titulo = 'Estante reativada'; break
    default: titulo = TIPO_EVENTO_ESTANTE[e.tipo as TipoEventoEstante] || String(e.tipo)
  }
  if (e.tipo === 'tubo_retirado') {
    if (e.motivo) linhas.push(`Motivo: ${e.motivo}`)
    if (e.observacao) linhas.push(`Justificativa: ${e.observacao}`)
  } else if (e.motivo || e.observacao) {
    linhas.push(`Motivo: ${[e.motivo, e.observacao].filter(Boolean).join(' — ')}`)
  }
  if (e.recuperado) linhas.push('Recuperado dos registros anteriores')
  return { titulo, linhas }
}
