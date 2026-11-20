// API de Parceiros (Etapa 2B) — limites de entrada e validação do POST /partner-orders.
// Sem dependências de runtime (usado pela Edge Function e testado com vitest). Regras:
//  - corpo medido pelos bytes realmente lidos (não só pelo Content-Length);
//  - texto livre: sem caracteres de controle/direção, aparado; quebras de linha só nas observações;
//  - nenhum erro devolve o valor enviado, só o nome do campo;
//  - não altera a obrigatoriedade de data_nascimento.

import { referenciaValida } from './parceiroAcesso.ts'

/** Todos os limites numéricos do POST ficam aqui. */
export const LIMITES_PEDIDO = {
  corpoBytes: 256 * 1024,
  exames: 50,
  codigoExame: 20,
  textoCurto: 200,
  observacao: 2000,
  listaItens: 50,
  listaItem: 200,
  email: 254,
  telefoneMin: 8,
  telefoneMax: 13,
  pesoMin: 0.2,
  pesoMax: 500,
  alturaMin: 0.2,
  alturaMax: 2.8,
  anoNascimentoMin: 1900,
  profundidadeJson: 32,
} as const

// ---------- corpo ----------

type CorpoLido = { ok: true; texto: string } | { ok: false }

/** Lê o corpo parando assim que passar de `max` bytes. */
export async function lerCorpoLimitado(
  req: { headers: { get: (n: string) => string | null }; body: ReadableStream<Uint8Array> | null },
  max: number = LIMITES_PEDIDO.corpoBytes,
): Promise<CorpoLido> {
  const declarado = Number(req.headers.get('content-length'))
  if (Number.isFinite(declarado) && declarado > max) {
    try { await req.body?.cancel() } catch { /* ignora */ }
    return { ok: false }
  }
  if (!req.body) return { ok: true, texto: '' }
  const reader = req.body.getReader()
  const partes: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > max) {
      try { await reader.cancel() } catch { /* ignora */ }
      return { ok: false }
    }
    partes.push(value)
  }
  const tudo = new Uint8Array(total)
  let pos = 0
  for (const p of partes) { tudo.set(p, pos); pos += p.byteLength }
  return { ok: true, texto: new TextDecoder().decode(tudo) }
}

// ---------- texto livre ----------

// U+0000–U+0008, U+000B, U+000C, U+000E–U+001F, U+007F e direção de texto U+202A–U+202E, U+2066–U+2069
const INVISIVEIS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g

/** Campos em que a quebra de linha é mantida. */
export const CAMPOS_MULTILINHA = new Set(['observacoes_gerais', 'observacao_atendimento'])

export function limparTexto(s: string, multilinha = false): string {
  let t = String(s).replace(INVISIVEIS, '')
  t = multilinha ? t.replace(/\r\n?/g, '\n') : t.replace(/[\r\n\t]+/g, ' ')
  return t.trim()
}

/** Limpa todas as strings do JSON; null quando o JSON é profundo demais. */
export function limparCorpo(v: unknown, chave = '', nivel = 0): { ok: true; valor: unknown } | { ok: false } {
  if (nivel > LIMITES_PEDIDO.profundidadeJson) return { ok: false }
  if (typeof v === 'string') return { ok: true, valor: limparTexto(v, CAMPOS_MULTILINHA.has(chave)) }
  if (Array.isArray(v)) {
    const out: unknown[] = []
    for (const x of v) {
      const r = limparCorpo(x, chave, nivel + 1)
      if (!r.ok) return r
      out.push(r.valor)
    }
    return { ok: true, valor: out }
  }
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const r = limparCorpo(x, k, nivel + 1)
      if (!r.ok) return r
      out[k] = r.valor
    }
    return { ok: true, valor: out }
  }
  return { ok: true, valor: v }
}

// ---------- validação ----------

export type Falha = { status: number; error: string; message: string; campo?: string }

const falhaCampo = (campo: string, motivo: string): Falha => ({
  status: 422, error: 'VALIDATION_ERROR', campo, message: `Campo inválido: ${campo} (${motivo})`,
})

const vazio = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
const primitivo = (v: unknown) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
// deno-lint-ignore no-explicit-any
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {})

/** Primeiro alias presente: [nome exibido no erro, valor]. */
function campo(base: Record<string, unknown>, prefixo: string, nomes: string[]): [string, unknown] | null {
  for (const n of nomes) if (!vazio(base[n])) return [`${prefixo}${n}`, base[n]]
  return null
}

function texto(c: [string, unknown] | null, max: number): Falha | null {
  if (!c) return null
  const [nome, v] = c
  if (!primitivo(v)) return falhaCampo(nome, 'deve ser texto')
  if (String(v).length > max) return falhaCampo(nome, `máximo de ${max} caracteres`)
  return null
}

function lista(c: [string, unknown] | null): Falha | null {
  if (!c) return null
  const [nome, v] = c
  let itens: unknown[]
  if (Array.isArray(v)) itens = v.filter((x) => !vazio(x))
  else if (primitivo(v)) itens = String(v).split(/[;,]/).map((x) => x.trim()).filter(Boolean)
  else return falhaCampo(nome, 'deve ser uma lista de textos')
  if (itens.length > LIMITES_PEDIDO.listaItens) return falhaCampo(nome, `máximo de ${LIMITES_PEDIDO.listaItens} itens`)
  for (let i = 0; i < itens.length; i++) {
    if (!primitivo(itens[i])) return falhaCampo(`${nome}[${i}]`, 'deve ser texto')
    if (String(itens[i]).length > LIMITES_PEDIDO.listaItem) return falhaCampo(`${nome}[${i}]`, `máximo de ${LIMITES_PEDIDO.listaItem} caracteres`)
  }
  return null
}

export const numeroDecimal = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const s = v.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  return Number(s)
}

function faixa(c: [string, unknown] | null, min: number, max: number, unidade: string): Falha | null {
  if (!c) return null
  const n = numeroDecimal(c[1])
  if (n === null || n < min || n > max) {
    return falhaCampo(c[0], `número entre ${String(min).replace('.', ',')} e ${String(max).replace('.', ',')} ${unidade}`)
  }
  return null
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/

function email(c: [string, unknown] | null): Falha | null {
  if (!c) return null
  const v = c[1]
  if (typeof v !== 'string' || v.length > LIMITES_PEDIDO.email || !EMAIL.test(v)) return falhaCampo(c[0], 'e-mail em formato inválido')
  return null
}

function telefone(c: [string, unknown] | null): Falha | null {
  if (!c) return null
  const v = c[1]
  const d = primitivo(v) ? String(v).replace(/\D/g, '') : ''
  if (d.length < LIMITES_PEDIDO.telefoneMin || d.length > LIMITES_PEDIDO.telefoneMax) {
    return falhaCampo(c[0], `telefone com ${LIMITES_PEDIDO.telefoneMin} a ${LIMITES_PEDIDO.telefoneMax} dígitos`)
  }
  return null
}

/** AAAA-MM-DD (com hora opcional) ou DD/MM/AAAA, conferida no calendário. */
export function dataDoCalendario(v: unknown): { ano: number; mes: number; dia: number } | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  let a: number, m: number, d: number
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/)
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (iso) { a = +iso[1]; m = +iso[2]; d = +iso[3] }
  else if (br) { a = +br[3]; m = +br[2]; d = +br[1] }
  else return null
  const dt = new Date(Date.UTC(a, m - 1, d))
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return { ano: a, mes: m, dia: d }
}

/** Data de hoje em Brasília (AAAA-MM-DD). */
const hojeBrasil = (agora: Date) => new Date(agora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10)

function data(c: [string, unknown] | null, nascimento: boolean, agora: Date): Falha | null {
  if (!c) return null
  const dt = dataDoCalendario(c[1])
  if (!dt) return falhaCampo(c[0], 'data inexistente ou fora do formato AAAA-MM-DD / DD/MM/AAAA')
  if (nascimento) {
    const iso = `${dt.ano}-${String(dt.mes).padStart(2, '0')}-${String(dt.dia).padStart(2, '0')}`
    if (dt.ano < LIMITES_PEDIDO.anoNascimentoMin) return falhaCampo(c[0], `data anterior a ${LIMITES_PEDIDO.anoNascimentoMin}`)
    if (iso > hojeBrasil(agora)) return falhaCampo(c[0], 'data no futuro')
  }
  return null
}

/** Código do exame como o handler lê (string ou { codigo | code }). */
export const codigoDoExame = (item: unknown): unknown =>
  typeof item === 'string' ? item : (item && typeof item === 'object' ? obj(item).codigo ?? obj(item).code ?? '' : item)

/** Protocolo do parceiro: ausente = null (opcional); presente = mesma regra do GET. */
export function lerProtocolo(body: unknown): { ok: true; valor: string | null } | { ok: false } {
  const b = obj(body)
  const v = b.protocolo_parceiro ?? b.partnerProtocol
  if (vazio(v)) return { ok: true, valor: null }
  if (!primitivo(v)) return { ok: false }
  const s = String(v).trim()
  return referenciaValida(s) ? { ok: true, valor: s } : { ok: false }
}

export const FALHA_PROTOCOLO: Falha = {
  status: 422, error: 'INVALID_PROTOCOL',
  message: 'protocolo_parceiro inválido: use apenas letras, números, hífen, underline ou ponto (1 a 64 caracteres)',
}
export const FALHA_CORPO_GRANDE: Falha = {
  status: 413, error: 'PAYLOAD_TOO_LARGE',
  message: `Corpo da requisição acima de ${LIMITES_PEDIDO.corpoBytes / 1024} KB`,
}

/**
 * Quantidade e formato dos exames e limites/formatos dos campos (depois de limparCorpo).
 * Não repete as validações atuais de obrigatórios (nome, cpf, exames) nem de CPF.
 */
export function validarCampos(body: unknown, agora = new Date()): Falha | null {
  const b = obj(body)
  const exames = Array.isArray(b.exames) ? b.exames : (Array.isArray(b.exams) ? b.exams : [])
  if (exames.length > LIMITES_PEDIDO.exames) {
    return { status: 422, error: 'TOO_MANY_EXAMS', message: `Máximo de ${LIMITES_PEDIDO.exames} exames por pedido` }
  }
  for (let i = 0; i < exames.length; i++) {
    const c = codigoDoExame(exames[i])
    if (!primitivo(c) && !vazio(c)) return falhaCampo(`exames[${i}].codigo`, 'deve ser texto')
    if (String(c ?? '').length > LIMITES_PEDIDO.codigoExame) return falhaCampo(`exames[${i}].codigo`, `máximo de ${LIMITES_PEDIDO.codigoExame} caracteres`)
  }

  const p = obj(b.paciente ?? b.patient)
  const dc = obj(p.dados_clinicos)
  const end = obj(p.endereco)
  const at = obj(b.atendimento)
  const med = obj(b.medico_solicitante ?? b.requesting_doctor)
  const conv = obj(b.convenio ?? b.insurance)
  const C = LIMITES_PEDIDO.textoCurto

  const checagens: (() => Falha | null)[] = [
    () => texto(campo(p, 'paciente.', ['nome', 'name']), C),
    () => texto(campo(p, 'paciente.', ['nome_social']), C),
    ...['rg', 'etnia', 'estado_civil', 'tipo_sanguineo', 'cep', 'logradouro', 'numero'].map((n) => () => texto(campo(p, 'paciente.', [n]), C)),
    () => texto(campo(dc, 'paciente.dados_clinicos.', ['tipo_sanguineo']), C),
    ...Object.keys(end).map((n) => () => texto(campo(end, 'paciente.endereco.', [n]), C)),
    () => texto(campo(p, 'paciente.', ['observacoes_gerais']), LIMITES_PEDIDO.observacao),
    ...['hospital', 'setor', 'leito', 'numero_prontuario'].map((n) => () => texto(campo(at, 'atendimento.', [n]), C)),
    () => texto(campo(at, 'atendimento.', ['observacao_atendimento']), LIMITES_PEDIDO.observacao),
    ...['alergias', 'condicoes_cronicas', 'medicacoes_continuas'].flatMap((n) => [
      () => lista(campo(p, 'paciente.', [n])),
      () => lista(campo(dc, 'paciente.dados_clinicos.', [n])),
    ]),
    () => faixa(campo(p, 'paciente.', ['peso_kg', 'peso']), LIMITES_PEDIDO.pesoMin, LIMITES_PEDIDO.pesoMax, 'kg'),
    () => faixa(campo(at, 'atendimento.', ['peso_kg']), LIMITES_PEDIDO.pesoMin, LIMITES_PEDIDO.pesoMax, 'kg'),
    () => faixa(campo(p, 'paciente.', ['altura_m', 'altura']), LIMITES_PEDIDO.alturaMin, LIMITES_PEDIDO.alturaMax, 'm'),
    () => faixa(campo(at, 'atendimento.', ['altura_m']), LIMITES_PEDIDO.alturaMin, LIMITES_PEDIDO.alturaMax, 'm'),
    () => email(campo(p, 'paciente.', ['email'])),
    () => email(campo(med, 'medico_solicitante.', ['email'])),
    () => telefone(campo(p, 'paciente.', ['telefone', 'phone'])),
    () => telefone(campo(med, 'medico_solicitante.', ['telefone'])),
    () => data(campo(p, 'paciente.', ['data_nascimento', 'birthDate']), true, agora),
    () => data(campo(conv, 'convenio.', ['validade']), false, agora),
  ]
  for (const f of checagens) {
    const r = f()
    if (r) return r
  }
  return null
}

/** Código seguro para repetir na resposta: só letras, números, hífen, underline ou ponto, até 20 caracteres. */
const CODIGO_SEGURO = /^[A-Za-z0-9._-]{1,20}$/
export function codigoSeguroParaEco(c: unknown): string | null {
  if (typeof c !== 'string' && typeof c !== 'number') return null
  const s = String(c).trim()
  return CODIGO_SEGURO.test(s) ? s : null
}

/** Mensagem do EXAM_CODE_NOT_FOUND: posição a partir de 1 e, quando seguro, o código enviado. */
export function falhaExameNaoEncontrado(itens: { posicao: number; enviado: unknown }[]) {
  const nao_encontrados = itens.map(i => ({ posicao: i.posicao, codigo: codigoSeguroParaEco(i.enviado) }))
  const partes = nao_encontrados.map(n => n.codigo ? `posição ${n.posicao} (código ${n.codigo})` : `posição ${n.posicao}`)
  return {
    message: `Código(s) de exame não reconhecido(s) na lista "exames": ${partes.join(', ')}. Use o Código interno do Catálogo de Exames (não o código TUSS/ANS). Nenhum pedido foi criado.`,
    posicoes: nao_encontrados.map(n => n.posicao),
    nao_encontrados,
  }
}
