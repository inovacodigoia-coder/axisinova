// API de Parceiros — log de requisições e limite por minuto (Etapa 2A).
// Sem dependências de runtime (testado com vitest). Regras:
//  - nunca grava corpo, Authorization, token, segredo ou dado de paciente (só os campos de LinhaLog);
//  - a gravação do log não atrasa nem derruba a resposta (roda depois, erros só no console);
//  - se a consulta de limite falhar, a requisição passa (fail-open) e o erro vai para o console;
//  - só para chamadas de parceiro: credenciais de equipamento não passam por aqui.

// deno-lint-ignore no-explicit-any
export type DbRpc = { rpc: (fn: string, args: Record<string, unknown>) => any }

export type Endpoint = 'oauth-token' | 'partner-orders' | 'list-exams-for-integration'

export interface CtxApi {
  requestId: string
  inicio: number
  endpoint: Endpoint
  metodo: string
  ip: string | null
  userAgent: string | null
  companyId: string | null
  partnerId: string | null
  clientId: string | null
}

export interface LinhaLog {
  request_id: string
  company_id: string | null
  partner_id: string | null
  client_id: string | null
  endpoint: string
  metodo: string
  status_code: number
  error_code: string | null
  ip: string | null
  user_agent: string | null
  duration_ms: number
}

export interface Limite { permitido: boolean; retryAfter: number; errorCode: 'RATE_LIMITED' | 'LOCKED' | 'QUEUE_FULL' | null }

type Headers = { get: (name: string) => string | null }

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const IPV6 = /^[0-9a-fA-F:]{2,39}$/
const ipValido = (v: string) => IPV4.test(v) || (v.includes(':') && IPV6.test(v))

/**
 * IP real do chamador. Usa `sb-forwarded-for` (gravado pela infraestrutura da plataforma, que
 * sobrescreve o valor enviado pelo cliente) e, na falta dele, `cf-connecting-ip` (a borda recusa
 * a requisição quando o cliente tenta enviar esse cabeçalho). Nunca usa X-Forwarded-For,
 * X-Real-IP ou True-Client-IP, que o cliente controla. Sem IP confiável: null.
 */
export function ipDoChamador(headers: Headers): string | null {
  for (const nome of ['sb-forwarded-for', 'cf-connecting-ip']) {
    const v = String(headers.get(nome) ?? '').split(',')[0].trim()
    if (v && ipValido(v)) return v
  }
  return null
}

export function novoContexto(req: { method: string; headers: Headers }, endpoint: Endpoint, agora = Date.now()): CtxApi {
  const ip = ipDoChamador(req.headers)
  if (!ip) console.warn(`[api-protecao] ${endpoint}: IP do chamador não determinado; só os limites por parceiro/client_id valem`)
  const rid = String(req.headers.get('sb-request-id') ?? '').trim()
  return {
    requestId: rid ? rid.slice(0, 100) : crypto.randomUUID(),
    inicio: agora,
    endpoint,
    metodo: String(req.method || '?').toUpperCase().slice(0, 10),
    ip,
    userAgent: String(req.headers.get('user-agent') ?? '').slice(0, 200) || null,
    companyId: null,
    partnerId: null,
    clientId: null,
  }
}

/** Só o identificador público; nada que pareça segredo vai para o log. */
const clientIdSeguro = (v: string | null) => {
  const s = String(v ?? '').trim()
  if (!s || /^axis_sec_/i.test(s)) return null
  return s.slice(0, 100)
}

export function linhaDeLog(ctx: CtxApi, statusCode: number, errorCode: string | null, agora = Date.now()): LinhaLog {
  return {
    request_id: ctx.requestId,
    company_id: ctx.companyId,
    partner_id: ctx.partnerId,
    client_id: clientIdSeguro(ctx.clientId),
    endpoint: ctx.endpoint,
    metodo: ctx.metodo,
    status_code: statusCode,
    error_code: errorCode ? String(errorCode).slice(0, 60) : null,
    ip: ctx.ip,
    user_agent: ctx.userAgent,
    duration_ms: Math.max(0, Math.round(agora - ctx.inicio)),
  }
}

/** Código de erro da resposta (campo `error` do JSON) — só lido em respostas de erro. */
export async function codigoDeErro(res: Response): Promise<string | null> {
  if (res.status < 400) return null
  try {
    const body = await res.clone().json()
    const code = body?.error ?? body?.code
    return typeof code === 'string' ? code : null
  } catch {
    return null
  }
}

/** Roda depois da resposta (EdgeRuntime.waitUntil quando existe); nunca lança. */
export function emSegundoPlano(p: Promise<unknown>) {
  const seguro = p.catch((e) => console.error('[api-protecao] tarefa em segundo plano falhou:', e instanceof Error ? e.message : e))
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime
  if (rt && typeof rt.waitUntil === 'function') rt.waitUntil(seguro)
}

async function chamar(db: DbRpc, fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args)
  if (error) throw new Error(error.message ?? String(error))
  return data
}

export async function gravarLog(db: DbRpc, linha: LinhaLog): Promise<void> {
  try {
    await chamar(db, 'api_log_registrar', { _log: linha })
  } catch (e) {
    console.error('[api-protecao] falha ao gravar log:', e instanceof Error ? e.message : e)
  }
}

const LIBERADO: Limite = { permitido: true, retryAfter: 0, errorCode: null }

function lerLimite(data: unknown): Limite {
  const d = (data ?? {}) as { permitido?: unknown; retry_after?: unknown; error_code?: unknown }
  if (d.permitido !== false) return LIBERADO
  if (d.error_code === 'QUEUE_FULL') return { permitido: false, retryAfter: 0, errorCode: 'QUEUE_FULL' }
  const retry = Math.max(1, Math.ceil(Number(d.retry_after) || 60))
  return { permitido: false, retryAfter: retry, errorCode: d.error_code === 'LOCKED' ? 'LOCKED' : 'RATE_LIMITED' }
}

/** Consome as regras [{regra, chave}] numa única consulta; erro de banco = deixa passar. */
export async function consumirLimites(db: DbRpc, itens: { regra: string; chave: string | null }[]): Promise<Limite> {
  const validos = itens.filter((i) => i.chave)
  if (!validos.length) return LIBERADO
  try {
    return lerLimite(await chamar(db, 'api_limite_consumir', { _itens: validos }))
  } catch (e) {
    console.error('[api-protecao] limite indisponível, requisição liberada:', e instanceof Error ? e.message : e)
    return LIBERADO
  }
}

export interface LimitePost extends Limite {
  /** Só no QUEUE_FULL: qual teto encheu e o valor dele. */
  escopo?: 'parceiro' | 'empresa'
  limite?: number
}

/**
 * POST /partner-orders (Etapa 2B): limite por minuto do parceiro/empresa e teto da fila
 * "aguardando autorização" na mesma consulta (api_partner_post_pre). Erro de banco = deixa passar.
 */
export async function verificarPostParceiro(db: DbRpc, partnerId: string, companyId: string): Promise<LimitePost> {
  try {
    const data = await chamar(db, 'api_partner_post_pre', { _partner_id: partnerId, _company_id: companyId })
    const lim = lerLimite(data)
    if (lim.errorCode !== 'QUEUE_FULL') return lim
    const d = (data ?? {}) as { escopo?: unknown; limite?: unknown }
    return { ...lim, escopo: d.escopo === 'empresa' ? 'empresa' : 'parceiro', limite: Number(d.limite) || undefined }
  } catch (e) {
    console.error('[api-protecao] limite do POST indisponível, requisição liberada:', e instanceof Error ? e.message : e)
    return LIBERADO
  }
}

export const mensagemFilaCheia = (escopo: 'parceiro' | 'empresa' = 'parceiro', limite?: number) =>
  `A fila de pedidos aguardando autorização está cheia${limite ? ` (limite de ${limite} por ${escopo})` : ''}. ` +
  'Aguarde a equipe do laboratório autorizar os pedidos pendentes antes de enviar novos.'

export interface LimiteOauth extends Limite {
  /** Credencial válida que passou apesar de um bloqueio ativo do IP ou do par client_id+IP. */
  bloqueioIgnorado: boolean
}

/**
 * /oauth-token DEPOIS de conferir client_id + segredo. Credencial válida: nunca recusada por bloqueio
 * de IP/par, só pelo limite de emissões do client_id. Inválida/inexistente: limite por IP e bloqueios.
 * Erro de banco = deixa passar.
 */
export async function verificarOauth(db: DbRpc, ip: string | null, clientId: string, credencialValida: boolean): Promise<LimiteOauth> {
  try {
    const data = await chamar(db, 'api_oauth_pre', {
      _ip: ip, _client_id: String(clientId ?? '').slice(0, 100), _credencial_valida: credencialValida === true,
    })
    const lim = lerLimite(data)
    const ignorado = credencialValida === true && lim.permitido && (data as { bloqueio_ignorado?: unknown })?.bloqueio_ignorado === true
    return { ...lim, bloqueioIgnorado: ignorado }
  } catch (e) {
    console.error('[api-protecao] limite do oauth indisponível, requisição liberada:', e instanceof Error ? e.message : e)
    return { ...LIBERADO, bloqueioIgnorado: false }
  }
}

/** error_code gravado quando uma credencial válida passa por um IP/par bloqueado (resposta 200). */
export const CODIGO_BLOQUEIO_IGNORADO = 'BLOCK_BYPASSED_VALID_CREDENTIAL'

export type ResultadoOauth = 'sucesso' | 'falha_credencial' | 'outro'

/** /oauth-token depois da resposta: conta sucesso/falha e grava o log na mesma consulta. */
export async function registrarOauth(db: DbRpc, ctx: CtxApi, resultado: ResultadoOauth, linha: LinhaLog): Promise<void> {
  try {
    await chamar(db, 'api_oauth_resultado', {
      _ip: ctx.ip, _client_id: clientIdSeguro(ctx.clientId) ?? '', _resultado: resultado, _log: linha,
    })
  } catch (e) {
    console.error('[api-protecao] falha ao registrar resultado do oauth:', e instanceof Error ? e.message : e)
  }
}

export const mensagemLimite = (segundos: number) =>
  `Limite de requisições excedido. Aguarde ${segundos} segundo${segundos === 1 ? '' : 's'} e tente novamente.`

export const MENSAGEM_BLOQUEIO = (segundos: number) =>
  `Muitas tentativas. Aguarde ${Math.ceil(segundos / 60)} minuto(s) e tente novamente.`

/** Regras de limite do partner-orders por método. */
export function regrasPartnerOrders(metodo: string, partnerId: string, companyId: string) {
  if (metodo === 'POST') {
    return [
      { regra: 'partner_post_parceiro', chave: partnerId },
      { regra: 'partner_post_empresa', chave: companyId },
    ]
  }
  if (metodo === 'GET') return [{ regra: 'partner_get_parceiro', chave: partnerId }]
  return []
}

/** list-exams-for-integration só é registrado/limitado com credencial de parceiro (nunca equipamento). */
export const protegerListaExames = (auth: { ok: boolean; partnerId?: string | null }) =>
  auth.ok === true && !!auth.partnerId
